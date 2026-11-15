"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "@/app/firebase";

const empty = new Set<string>();
const HiddenFriends = createContext({ ready: false, ids: empty, names: empty, hide: async (_uid: string, _name: string) => {} });

export function HiddenFriendsProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState({ ready: false, ids: empty, names: empty });
  const [pending, setPending] = useState<Record<string, string>>({});
  const writes = useRef(new Set<string>());
  useEffect(() => {
    let stop = () => {};
    const stopAuth = onAuthStateChanged(auth, user => {
      stop();
      setPending({});
      setValue({ ready: !user, ids: empty, names: empty });
      if (!user) return;
      stop = onSnapshot(query(collection(db, "hidden"), where("user_id", "==", user.uid)), snapshot => {
        const ids = new Set<string>(), names = new Set<string>();
        snapshot.docs.forEach(d => {
          const { target_uid, target_name } = d.data();
          if (typeof target_uid === "string") ids.add(target_uid);
          if (typeof target_name === "string") names.add(target_name);
        });
        setValue({ ready: true, ids, names });
        setPending(current => Object.fromEntries(Object.entries(current).filter(([uid]) => !ids.has(uid))));
      });
    });
    return () => { stopAuth(); stop(); };
  }, []);
  const hide = async (uid: string, name: string) => {
    const owner = auth.currentUser?.uid;
    if (!owner || !uid || owner === uid) throw Error("다시 로그인한 뒤 숨겨 줘.");
    const key = JSON.stringify([owner, uid]);
    if (writes.current.has(key)) return;
    writes.current.add(key);
    setPending(current => ({ ...current, [uid]: name }));
    try {
      // Use an automatic document ID to stay compatible with existing hide records.
      await setDoc(doc(collection(db, "hidden")), { user_id: owner, target_uid: uid, target_name: name });
    } catch (error) {
      if (auth.currentUser?.uid === owner) setPending(current => Object.fromEntries(Object.entries(current).filter(([id]) => id !== uid)));
      throw error;
    } finally { writes.current.delete(key); }
  };
  const ids = Object.keys(pending).length ? new Set([...Array.from(value.ids), ...Object.keys(pending)]) : value.ids;
  const names = Object.keys(pending).length ? new Set([...Array.from(value.names), ...Object.values(pending)]) : value.names;
  return <HiddenFriends.Provider value={{ ...value, ids, names, hide }}>{children}</HiddenFriends.Provider>;
}

export function useHiddenFriends() {
  const { ready, ids, names, hide } = useContext(HiddenFriends);
  return { ready, ids, names, hide, visible: (uid?: string | null, name?: string | null) =>
    ready && (!uid || !ids.has(uid)) && (!name || !names.has(name)) };
}
