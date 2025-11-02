// PageContainer.js

import Footer from "/components/Footer";
import Header from "/components/Header";
import { ThemeProvider } from "next-themes";

const PageContainer = ({ children }) => {
  return (
    <>
      <ThemeProvider attribute="class" enableSystem={true}>
        <div className="flex w-full min-h-screen dark:bg-slate-700">
          {/* 본문 영역 */}
          <div className="flex-1 w-full dark:bg-slate-700">
            <Header />
            <main className="w-full p-4 dark:bg-slate-700">{children}</main>
            <Footer />
          </div>
        </div>
      </ThemeProvider>
    </>
  );
};

export default PageContainer;
