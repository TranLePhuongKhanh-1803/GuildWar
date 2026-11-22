import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, db, storage } from '../config/firebase';
import { SUBMISSION_STATUS } from '../constants/config';
import { createNewWeek } from '../utils/storage';
import { createDemoSubmissions } from '../utils/demoData';

const WEEKS_COL = 'weeks';
const SUBMISSIONS_COL = 'submissions';
const ADMINS_COL = 'admins';

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export function subscribeAdminAuth(onChange) {
  if (!auth || !db) {
    onChange({ user: null, isAdmin: false });
    return () => {};
  }

  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      onChange({ user: null, isAdmin: false });
      return;
    }
    try {
      const adminSnap = await getDoc(doc(db, ADMINS_COL, user.uid));
      onChange({ user, isAdmin: adminSnap.exists() });
    } catch {
      onChange({ user, isAdmin: false });
    }
  });
}

export async function signInAdminFirebase(email, password) {
  if (!auth || !db) {
    throw new Error('Firebase Auth chưa được khởi tạo.');
  }
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  const adminSnap = await getDoc(doc(db, ADMINS_COL, cred.user.uid));
  if (!adminSnap.exists()) {
    await signOut(auth);
    throw new Error(
      `Tài khoản chưa có quyền Admin. Hãy thêm document UID "${cred.user.uid}" vào collection "admins" trên Firebase Console.`
    );
  }
  return cred.user;
}

export async function signOutAdminFirebase() {
  if (!auth) return;
  await signOut(auth);
}

export function subscribeGuildWarData(onData, onError) {
  if (!db) return () => {};

  let weeksCache = null;
  let subsCache = null;

  const emitIfReady = () => {
    if (weeksCache === null || subsCache === null) return;

    if (weeksCache.length === 0) {
      onData({ currentWeek: null, history: [] });
      return;
    }

    const subsByWeek = new Map();
    for (const sub of subsCache) {
      const list = subsByWeek.get(sub.weekId) || [];
      list.push(sub);
      subsByWeek.set(sub.weekId, list);
    }

    const hydratedWeeks = weeksCache.map((w) => ({
      ...w,
      submissions: subsByWeek.get(w.id) || [],
    }));

    const currentWeek = hydratedWeeks.find((w) => w.isCurrent) || hydratedWeeks[0];
    const history = hydratedWeeks.filter((w) => w.id !== currentWeek.id);

    onData({ currentWeek, history });
  };

  const unsubWeeks = onSnapshot(
    query(collection(db, WEEKS_COL), orderBy('createdAt', 'desc')),
    (snapshot) => {
      weeksCache = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      emitIfReady();
    },
    (err) => onError?.(err)
  );

  const unsubSubs = onSnapshot(
    query(collection(db, SUBMISSIONS_COL), orderBy('createdAt', 'desc')),
    (snapshot) => {
      subsCache = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      emitIfReady();
    },
    (err) => onError?.(err)
  );

  return () => {
    unsubWeeks();
    unsubSubs();
  };
}

export async function createInitialWeekFirebase() {
  const initialWeek = { ...createNewWeek(1), isCurrent: true };
  await setDoc(doc(db, WEEKS_COL, initialWeek.id), initialWeek);
  return initialWeek;
}

function withTimeout(promise, ms, timeoutMessage) {
  let timerId;
  const timeoutPromise = new Promise((_, reject) => {
    timerId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timerId));
}

function mapStorageError(err) {
  const code = err?.code || '';
  if (code === 'storage/unauthorized') {
    return 'Firebase Storage từ chối quyền upload (storage/unauthorized). Hãy kiểm tra và Publish file storage.rules trên Firebase Console.';
  }
  if (code === 'storage/bucket-not-found' || code === 'storage/project-not-found') {
    return 'Không tìm thấy Firebase Storage Bucket. Hãy kiểm tra bạn đã bật Storage trong Firebase Console và cấu hình đúng VITE_FIREBASE_STORAGE_BUCKET chưa.';
  }
  if (code === 'storage/retry-limit-exceeded') {
    return 'Upload ảnh lên Firebase Storage quá thời gian cho phép (hết lượt thử lại). Có thể Storage chưa được bật hoặc mạng bị chặn.';
  }
  if (code === 'storage/canceled') {
    return 'Quá trình upload ảnh đã bị hủy.';
  }
  return `Lỗi upload ảnh minh chứng: ${err?.message || 'Không xác định.'}`;
}

function mapFirestoreWriteError(err) {
  const code = err?.code || '';
  if (code === 'permission-denied') {
    return 'Firestore từ chối quyền ghi (permission-denied). Hãy kiểm tra sự kiện tuần đang Mở và bạn đã Publish đúng firestore.rules.';
  }
  if (code === 'unavailable') {
    return 'Không thể kết nối tới Cloud Firestore. Vui lòng kiểm tra kết nối Internet.';
  }
  return `Lỗi lưu điểm vào Firestore: ${err?.message || 'Không xác định.'}`;
}

export async function addSubmissionFirebase({ weekId, playerName, score, proofImage }) {
  if (!db) {
    throw new Error('Cloud Firestore chưa được khởi tạo.');
  }
  if (!storage) {
    throw new Error('Firebase Storage chưa được cấu hình để lưu URL ảnh minh chứng.');
  }
  if (!weekId) {
    throw new Error('Không xác định được tuần sự kiện hiện tại.');
  }
  if (!proofImage || !proofImage.startsWith('data:')) {
    throw new Error('Dữ liệu ảnh minh chứng không hợp lệ. Vui lòng chọn lại ảnh.');
  }

  const subId = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const blob = dataUrlToBlob(proofImage);
  const storagePath = `proofs/${weekId}/${subId}.jpg`;
  const storageRef = ref(storage, storagePath);

  let imageUrl;
  try {
    await withTimeout(
      uploadBytes(storageRef, blob, { contentType: blob.type || 'image/jpeg' }),
      20000,
      'Quá thời gian tải ảnh lên Firebase Storage (20 giây). Hãy kiểm tra bạn đã bật Firebase Storage và Publish storage.rules trên Firebase Console chưa.'
    );
    imageUrl = await withTimeout(
      getDownloadURL(storageRef),
      10000,
      'Không lấy được URL ảnh sau khi tải lên Firebase Storage.'
    );
  } catch (err) {
    throw new Error(mapStorageError(err));
  }

  const payload = {
    id: subId,
    weekId,
    playerName,
    score,
    proofImage: imageUrl,
    storagePath,
    status: SUBMISSION_STATUS.PENDING,
    createdAt: new Date().toISOString(),
  };

  try {
    await withTimeout(
      setDoc(doc(db, SUBMISSIONS_COL, subId), payload),
      15000,
      'Quá thời gian lưu dữ liệu vào Cloud Firestore (15 giây). Vui lòng thử lại.'
    );
  } catch (err) {
    // Dọn ảnh vừa upload nếu lưu Firestore thất bại để tránh rác Storage
    try {
      await deleteObject(storageRef);
    } catch {
      // Bỏ qua nếu không xóa được
    }
    throw new Error(mapFirestoreWriteError(err));
  }

  return payload;
}

export async function updateWeekMetaFirebase(weekId, { title, startTime, endTime }) {
  await updateDoc(doc(db, WEEKS_COL, weekId), { title, startTime, endTime });
}

export async function toggleWeekOpenFirebase(weekId, isOpen) {
  await updateDoc(doc(db, WEEKS_COL, weekId), { isOpen });
}

export async function moderateSubmissionFirebase(subId, status) {
  await updateDoc(doc(db, SUBMISSIONS_COL, subId), { status });
}

export async function editSubmissionScoreFirebase(subId, score) {
  await updateDoc(doc(db, SUBMISSIONS_COL, subId), { score });
}

export async function deleteSubmissionFirebase(sub) {
  await deleteDoc(doc(db, SUBMISSIONS_COL, sub.id));
  if (storage && sub.storagePath) {
    try {
      await deleteObject(ref(storage, sub.storagePath));
    } catch {
      // Ignore missing storage file
    }
  }
}

export async function saveRewardsFirebase(weekId, rewards) {
  await updateDoc(doc(db, WEEKS_COL, weekId), { rewards });
}

export async function endWeekAndCreateNewFirebase(currentWeek) {
  const nextWeekNumber = (currentWeek.weekNumber || 1) + 1;
  const nextWeek = { ...createNewWeek(nextWeekNumber), isCurrent: true };

  const batch = writeBatch(db);
  batch.update(doc(db, WEEKS_COL, currentWeek.id), {
    isCurrent: false,
    isOpen: false,
    endedAt: new Date().toISOString(),
  });
  batch.set(doc(db, WEEKS_COL, nextWeek.id), nextWeek);
  await batch.commit();
}

export async function resetAllFirebase() {
  const [weeksSnap, subsSnap] = await Promise.all([
    getDocs(collection(db, WEEKS_COL)),
    getDocs(collection(db, SUBMISSIONS_COL)),
  ]);

  const batch = writeBatch(db);
  subsSnap.docs.forEach((d) => batch.delete(d.ref));
  weeksSnap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  const freshWeek = { ...createNewWeek(1), isCurrent: true };
  await setDoc(doc(db, WEEKS_COL, freshWeek.id), freshWeek);
}

export async function seedDemoDataFirebase(weekId) {
  const demos = createDemoSubmissions();
  const batch = writeBatch(db);
  demos.forEach((item) => {
    const payload = { ...item, weekId, storagePath: null };
    batch.set(doc(db, SUBMISSIONS_COL, item.id), payload);
  });
  await batch.commit();
}
