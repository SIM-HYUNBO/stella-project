// PageContainer.js

import Footer from "/components/Footer";
import Header from "/components/Header";
import { ThemeProvider } from "next-themes";

const PageContainer = ({ children }) => {
  return (
    <>
      <ThemeProvider attribute="class" enableSystem={true}>
        <div className="flex w-full min-h-screen">
          {/* 본문 영역 */}
          <div className="flex-1 w-full">
            <Header />
            <main className="w-full p-4">{children}</main>
            <Footer />
          </div>
        </div>
      </ThemeProvider>
    </>
  );
};

export default PageContainer;
