"use client";

import { useEffect, useState } from "react";
import PageContainer from "../../components/PageContainer";
import Image from "next/image";
import { useTheme } from "next-themes";
import HamburgerMenu from "../../components/hamburgermenu";
import Link from "next/link";
import { watchAuthState } from "../authService";
import { User } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  limit,
  orderBy,
} from "firebase/firestore";
import { db } from "@/app/firebase";
import CommentBox from "../../components/CommentBox";

interface UserProfile {
  uid: string;
  nickname: string;
  grade: "초등" | "중등";
}

export default function Home() {
  const { theme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [postId, setPostId] = useState<string | null>(null);

  // 로그인 상태 + 유저 정보
  useEffect(() => {
    const unsubscribe = watchAuthState(async (u) => {
      setUser(u);

      if (u) {
        const userDoc = await getDoc(doc(db, "users", u.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserProfile({
            uid: u.uid,
            nickname: data.nickname || "익명",
            grade: data.grade || "초등",
          });
        }
      } else {
        setUserProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // 첫 게시글 id
  useEffect(() => {
    const fetchFirstPost = async () => {
      const postsCol = collection(db, "posts");
      const q = query(postsCol, orderBy("createdAt", "desc"), limit(1));
      const snap = await getDocs(q);

      if (!snap.empty) {
        setPostId(snap.docs[0].id);
      }
    };

    fetchFirstPost();
  }, []);

  // 로딩
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white dark:bg-gray-900">
        Loading...
      </div>
    );
  }

  return (
    <PageContainer>
      {/* ✅ 헤더 오른쪽: 로그인 / 회원가입만 */}
      {!user && (
        <div className="absolute top-5 right-20 flex gap-4 z-50">
          <Link
            href="/login"
            className="px-6 py-3 bg-yellow-50 text-orange-900 hover:bg-yellow-100 rounded-3xl border border-yellow-400 text-center"
          >
            로그인
          </Link>
         
        </div>
      )}

      <div className="flex w-full min-h-screen">
        <div className="flex-1">
          <h1 className="text-5xl text-orange-400 dark:text-white ml-11 mt-5 max-w-3xl w-full text-left">
            We are Genius in Everything.
          </h1>

          {/* ❗ 햄버거 그대로 */}
          <HamburgerMenu />

          <h1 className="text-2xl text-orange-900 dark:text-white ml-11 mt-5 w-full text-left">
            Good Luck! You found our page.
            <br />
            You can check the tips about studying here. Be a genius!
          </h1>

          <div className="w-full">
            <div>
              <Image
                src="/images/sim.gif"
                alt="설명 텍스트"
                width={300}
                height={300}
                className="ml-10 mt-3 mb-3 rounded-xl"
              />
            </div>

            {/* ✅ 항상 표시 + 이미지 바로 아래 */}
            <Link
              href="/board"
              className="ml-10 inline-block px-4 py-2 bg-yellow-300 text-white rounded hover:bg-yellow-400"
            >
              WAGIE 게시판 가는 길
            </Link>
          </div>

          {/* 댓글창 (조건 그대로) */}
          {user && userProfile && postId && (
            <div className="ml-4 mt-5">
              <CommentBox userProfile={userProfile} postId="m-home" />
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
