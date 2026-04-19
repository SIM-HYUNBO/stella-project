// PageContainer.js

import Footer from "/components/Footer";
import Header from "/components/Header";

const PageContainer = ({ children }) => {
  return (
    <div className="flex w-full min-h-screen">
      <div className="flex-1 w-full">
        <Header />
        <main className="w-full p-4">{children}</main>
      </div>
    </div>
  );
};

export default PageContainer;