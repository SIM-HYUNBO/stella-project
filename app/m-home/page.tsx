"use client";

import { useEffect, useState } from "react";
import PageContainer from "../../components/PageContainer";
import Image from "next/image";
import { useTheme } from "next-themes";
import HamburgerMenu from "../../components/hamburgermenu";
import Link from "next/link";
import { watchAuthState } from "../authService"; // 로그인 상태 감지
import { User } from "firebase/auth";
import { doc, getDoc, collection, getDocs, query, limit, orderBy } from "firebase/firestore";
import { db } from "@/app/firebase"; // Firestore
import CommentBox from "../../components/CommentBox";

interface UserProfile {
  uid: string;
  nickname: string;
  grade: "초등" | "중등";
}

export default function Home() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(theme);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [postId, setPostId] = useState<string | null>(null);

  // 로그인 상태 추적 + Firestore에서 유저 정보 불러오기
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

  // 첫 번째 게시글 가져오기 (홈에서 댓글창 띄우기용)
  useEffect(() => {
    const fetchFirstPost = async () => {
      const postsCol = collection(db, "posts");
      const q = query(postsCol, orderBy("createdAt", "desc"), limit(1));
      const querySnap = await getDocs(q);

      if (!querySnap.empty) {
        const firstDoc = querySnap.docs[0];
        setPostId(firstDoc.id);
      } else {
        console.log("게시글이 없습니다.");
      }
    };

    fetchFirstPost();
  }, []);

  // 페이지 초기 로딩 상태 해제
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 700);
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
      <div className="flex w-full min-h-screen">
        <div className="flex-1">
          <h1 className="text-5xl text-orange-400 dark:text-white ml-11 mt-5 max-w-3xl w-full text-left">
            We are Genius in Everything.
          </h1>

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
                className="ml-10 mt-3 mb-5 rounded-xl"
              />
            </div>

            {!user ? (
              <div className="flex flex-row ml-10 gap-4">
                <Link
                  href="/login"
                  className="px-6 py-3 bg-blue-400 text-white rounded-xl text-center hover:bg-blue-500"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="px-6 py-3 bg-green-400 text-white rounded-xl text-center hover:bg-green-500"
                >
                  회원가입
                </Link>
              </div>
            ) : (
              <Link
                href="/board"
                className="px-4 py-2 ml-10 mt-5 bg-yellow-300 text-white rounded hover:bg-yellow-400"
              >
                WAGIE 게시판 가는 길
              </Link>
            )}
          </div>

          {/* 댓글창 */}
          {user && userProfile && postId && (
            <CommentBox userProfile={userProfile} postId="m-home" />
          )}
        </div>
      </div>
    </PageContainer>
  );
}
