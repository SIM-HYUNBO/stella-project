"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageContainer from "../../components/PageContainer";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";

const ADMIN_KEYWORDS = ["admin", "manager", "root", "관리자"];

export default function SignupPage() {

  const router = useRouter();

  const [email,setEmail]=useState("")
  const [password,setPassword]=useState("")
  const [confirmPassword,setConfirmPassword]=useState("")
  const [nickname,setNickname]=useState("")
  const [birth,setBirth]=useState("")
  const [phone,setPhone]=useState("")
  const [error,setError]=useState("")
  const [checkingNickname,setCheckingNickname]=useState(false)

  const validateNickname=(nick:string):string|null=>{

    const trimmed=nick.trim()

    if(ADMIN_KEYWORDS.some(kw=>trimmed.toLowerCase().includes(kw))){
      return "관리자 관련 단어는 사용할 수 없습니다."
    }

    if(!/^[\w가-힣]+$/.test(trimmed)){
      return "이모지나 특수문자는 사용할 수 없습니다."
    }

    if(trimmed.length>8){
      return "닉네임은 8자 이하로 입력해주세요."
    }

    if(/\s/.test(trimmed)){
      return "닉네임에 공백을 포함할 수 없습니다."
    }

    return null
  }

  const handleSignup=async(e:React.FormEvent)=>{

    e.preventDefault()
    setError("")

    if(password!==confirmPassword){
      setError("비밀번호가 일치하지 않습니다.")
      return
    }

    if(!nickname.trim()){
      setError("닉네임을 입력해주세요.")
      return
    }

    const nickError=validateNickname(nickname)
    if(nickError){
      setError(nickError)
      return
    }

    try{

      setCheckingNickname(true)

      const q=query(
        collection(db,"users"),
        where("nickname","==",nickname)
      )

      const querySnapshot=await getDocs(q)

      if(!querySnapshot.empty){
        setError("이미 사용 중인 닉네임입니다.")
        setCheckingNickname(false)
        return
      }

      const userCredential=await createUserWithEmailAndPassword(auth,email,password)
      const user=userCredential.user

      await setDoc(doc(db,"users",user.uid),{
        email,
        nickname,
        birth,
        phone,
        createdAt:serverTimestamp()
      })

      await updateProfile(user,{displayName:nickname})

      alert(`${nickname}님 회원가입 완료`)
      router.push("/home")

    }catch(err){

      console.error("회원가입 오류:",err)
      setError("회원가입 중 오류가 발생했습니다.")

    }finally{
      setCheckingNickname(false)
    }

  }

  return(

<PageContainer>

<div className="flex justify-center items-center min-h-screen">

<div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-lg">

<h1 className="text-3xl font-bold text-center text-green-400 mb-6">
회원가입
</h1>

<form className="flex flex-col gap-4" onSubmit={handleSignup}>

<input
type="text"
placeholder="닉네임"
className="px-4 py-3 rounded-lg border"
value={nickname}
onChange={(e)=>setNickname(e.target.value)}
required
/>

<input
type="email"
placeholder="이메일"
className="px-4 py-3 rounded-lg border"
value={email}
onChange={(e)=>setEmail(e.target.value)}
required
/>

<input
type="password"
placeholder="비밀번호"
className="px-4 py-3 rounded-lg border"
value={password}
onChange={(e)=>setPassword(e.target.value)}
required
/>

<input
type="password"
placeholder="비밀번호 확인"
className="px-4 py-3 rounded-lg border"
value={confirmPassword}
onChange={(e)=>setConfirmPassword(e.target.value)}
required
/>

<input
type="date"
className="px-4 py-3 rounded-lg border"
value={birth}
onChange={(e)=>setBirth(e.target.value)}
required
/>

<input
type="tel"
placeholder="전화번호"
className="px-4 py-3 rounded-lg border"
value={phone}
onChange={(e)=>setPhone(e.target.value)}
required
/>

{error && (
<p className="text-red-500 text-sm text-center">
{error}
</p>
)}

<button
type="submit"
disabled={checkingNickname}
className="mt-4 px-6 py-3 bg-green-400 text-white rounded-xl"
>

{checkingNickname ? "처리중..." : "회원가입"}

</button>

</form>

<p className="mt-6 text-center text-gray-600">

이미 계정이 있으신가요?  

<a href="/login" className="text-blue-400 ml-1">
로그인
</a>

</p>

</div>

</div>

</PageContainer>

)

}