"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "@/app/firebase";

const empty = new Set<string>();
const HiddenFriends = createContext({ ready: false, ids: empty, names: empty });

export function HiddenFriendsProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState({ ready: false, ids: empty, names: empty });
  useEffect(() => {
    let stop = () => {};
    const stopAuth = onAuthStateChanged(auth, user => {
      stop();
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
      }, () => setValue({ ready: false, ids: empty, names: empty }));
    });
    return () => { stopAuth(); stop(); };
  }, []);
  return <HiddenFriends.Provider value={value}>{children}</HiddenFriends.Provider>;
}

export function useHiddenFriends() {
  const { ready, ids, names } = useContext(HiddenFriends);
  return { ready, ids, names, visible: (uid?: string | null, name?: string | null) =>
    ready && (!uid || !ids.has(uid)) && (!name || !names.has(name)) };
}
