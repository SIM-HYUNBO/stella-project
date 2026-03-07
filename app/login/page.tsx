"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageContainer from "../../components/PageContainer";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function LoginPage() {

const router = useRouter()

const [email,setEmail]=useState("")
const [password,setPassword]=useState("")
const [phone,setPhone]=useState("")
const [error,setError]=useState("")

const handleLogin=async(e:React.FormEvent)=>{

e.preventDefault()
setError("")

try{

const q=query(
collection(db,"users"),
where("email","==",email),
where("phone","==",phone)
)

const snapshot=await getDocs(q)

if(snapshot.empty){
setError("이메일 또는 전화번호가 맞지 않습니다.")
return
}

await signInWithEmailAndPassword(auth,email,password)

router.push("/home")

}catch(err){

console.error(err)
setError("로그인 실패")

}

}

return(

<PageContainer>

<div className="flex justify-center items-center min-h-screen">

<div className="w-full max-w-md bg-white dark:bg-gray-800 p-10 rounded-2xl shadow-lg">

<h1 className="text-3xl font-bold text-center text-blue-400 mb-6">
로그인
</h1>

<form onSubmit={handleLogin} className="flex flex-col gap-4">

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
className="mt-4 px-6 py-3 bg-blue-400 text-white rounded-xl"
>
로그인
</button>

</form>

<p className="mt-6 text-center text-gray-600">

계정이 없으신가요?

<a href="/signup" className="text-green-400 ml-1">
회원가입
</a>

</p>

</div>

</div>

</PageContainer>

)

}