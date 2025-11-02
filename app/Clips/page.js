"use client";
import { useState, useEffect } from "react";
import PageContainer from "/components/PageContainer";
// import DotSpinner from "/components/DotSpinner";
import { CenterSpinner } from "/components/CenterSpinner";
import HamburgerMenu from "/components/hamburger";

export default function Clips() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* {loading && <DotSpinner />} */}
      {loading && <CenterSpinner />}

      <PageContainer>
        <div className="p-6">
          <h1 className="text-3xl font-bold text-orange-900 dark:text-white mb-4">
            helpful clips.
          </h1>
          <HamburgerMenu />

          <div className="relative w-full h-0 pb-[56.25%]">
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src="https://www.youtube.com/embed/ZvjCiJALNTY"
              title="YouTube video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </PageContainer>
    </>
  );
}
