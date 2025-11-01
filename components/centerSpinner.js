// 로딩 스피너 컴포넌트 파일명 대문자 
export function CenterSpinner() {
  return (
    <div className="fixed inset-0 flex justify-center items-center z-50">
      <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
