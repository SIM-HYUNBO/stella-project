import PageContainer from "@/components/PageContainer";
import Image from "next/image";


export default function Images() {
  return (
    <PageContainer>
      <div className="flex flex-row md:flex-row w-full">
        <div className="w-screen h-screen">
          <h1 className="text-5xl text-green-800 dark:text-white ml-14 mt-5 w-full text-left">
            There are some place to write important info.
          </h1>

          <h3 className="text-1xl text-black dark:text-white ml-14 mt-5 w-full text-left">
            Drawings in 2024 summer
          </h3>
          <div className="mt-3 flex flex-row space-x-4 ml-7">
            <div>
              <Image
                src="/images/IMG_5616.jpeg" // public/images 폴더 내 이미지
                alt="설명 텍스트"
                width={200}
                height={125}
                layout="intrinsic" />
            </div>
            <div>
              <Image
                src="/images/IMG_3069.jpg" // public/images 폴더 내 이미지
                alt="설명 텍스트"
                width={200}
                height={125}
                layout="intrinsic" />
            </div>
            <div>
              <Image
                src="/images/IMG_3131.jpg" // public/images 폴더 내 이미지
                alt="설명 텍스트"
                width={200}
                height={125}
                layout="intrinsic" />
            </div>
            <div>
              <Image
                src="/images/IMG_3130.jpg" // public/images 폴더 내 이미지
                alt="설명 텍스트"
                width={200}
                height={125}
                layout="intrinsic" />
            </div>
          </div>
          <div className="w-screen">
            <h1 className="text-3xl text-green-800 ml-14 mt-5 w-full text-left"></h1>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
