# 컴퓨터에서 WAGIE 안드로이드 앱 테스트

이 APK는 `https://www.wagie.net`에 연결하는 **온라인 테스트 앱**이다. Next.js API 서버는 사이트에서 계속 실행한다. 인터넷 연결이 필요하며, 플레이스토어 배포용 릴리스 APK가 아니다.

## 만들어진 파일

`output/android/WAGIE-1.3.48-test.apk`

디버그 서명된 설치 파일이다. APK와 서명 키는 Git에 올리지 않는다. 다른 컴퓨터에서 빌드한 APK는 디버그 서명 키가 달라 업데이트 설치가 실패할 수 있다. 이때 삭제 후 설치하면 앱 내부 로그인 정보도 지워질 수 있다.

## 가상 안드로이드 준비

이 컴퓨터에는 `WAGIE_API36` 가상 기기를 만들어 두었다. Android Studio의 Device Manager에서 이 이름 옆 ▶ 버튼을 누르면 된다. 처음 실행할 때는 부팅에 시간이 걸릴 수 있다.

1. Android Studio를 열고 **Device Manager → Create Virtual Device**를 선택한다. 시작 화면에서는 **More Actions → Virtual Device Manager**로 들어간다.
2. Pixel 기기를 고른다. 실제 삼성 폰이나 안드로이드 폰은 필요 없다.
3. **Android 16 / API 36 / Google APIs / x86_64** 이미지를 내려받고 가상 기기를 만든다.
4. 가상 기기 오른쪽의 ▶ 버튼으로 실행한다.
5. APK 파일을 가상 폰 화면에 끌어다 놓아 설치한다. 앱 목록에서 **WAGIE**를 누른다.

터치 대신 마우스로 누르고, PC 키보드로 입력하면 된다. 로그인은 사용자가 직접 한다.

## 다시 빌드

프로젝트 폴더에서:

```powershell
npm run android:apk
```

Android Studio의 Java 21과 Android SDK Platform 36이 필요하다. `android/local.properties`에 SDK 경로가 있으면 빌드 스크립트가 읽는다. 다른 위치에 설치했다면 실행 전에 `ANDROID_HOME`을 지정한다.

실행 중인 가상 폰에 명령으로 설치하려면:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r output/android/WAGIE-1.3.48-test.apk
```

## 확인할 것

- 로그인/로그아웃, 채팅 목록, 실제 메시지 전송/수신
- 사진 선택, 마이크·카메라 권한, 음성/영상 통화
- 안드로이드 뒤로가기, 화면 회전, 키보드 표시, 인터넷 연결 끊김

웹 푸시와 네이티브 푸시는 다르다. 기존 브라우저 FCM만으로 이 WebView 앱의 백그라운드 알림이 동작한다고 보장하지 않는다. 네이티브 푸시 연결은 별도 작업이다. 계절·날씨에 따른 자동 아이콘 변경도 아직 연결하지 않았다. 현재 설치 아이콘은 야구모자 오리다.

Capacitor `server.url`은 개발·테스트 용도다. 릴리스 빌드에서 이 설정이 남아 있으면 Gradle이 중단하도록 해 두었다. 스토어 출시 전에는 웹 자산 번들링, 네이티브 알림과 서명·배포 구성을 정리해야 한다.

참고: https://capacitorjs.com/docs/config / https://developer.android.com/studio/run/managing-avds
