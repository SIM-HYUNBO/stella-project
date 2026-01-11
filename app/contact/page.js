"use client";
import { useState, useEffect } from "react";
import PageContainer from "/components/PageContainer";
import { CenterSpinner } from "/components/CenterSpinner";
import Image from "next/image";
import HamburgerMenu from "/components/hamburger";
export default function Contact() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {loading && <CenterSpinner />}
      <PageContainer>
        <div className="items-start justify-start p-6">
          <h1 className="text-[2rem] text-orange-400 dark:text-white mb-4">
            Visit us again!
          </h1>
          <HamburgerMenu />
          <h2 className="text-2xl font-semibold text-orange-300 dark:text-gray-300 mt-5">
            Contact Us
          </h2>
          <h3 className="text-lg text-orange-900 dark:text-gray-300 mt-2">
            {`We'd love to hear from you anytime.`}
          </h3>
          <div className="w-full">
            <div>
              <Image
                src="/images/tell.jpeg"
                alt="설명 텍스트"
                width={300}
                height={300}
                className="ml-10 mt-5 mb-5 rounded-xl"
              />
            </div>
          </div>
          <div className="w-0 h-screen"></div>
        </div>
      </PageContainer>
    </>
  );
}
