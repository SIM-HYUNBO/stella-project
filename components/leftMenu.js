"use strict";
import Link from "next/link";
export default function LeftMenu() {
  return (
    <>
    <aside className="fixed left-0 top-0 h-full w-64 px-4 pt-32 shadow-lg z-50 bg-pink-200 dark:bg-blue-200">

      <nav className="relative h-full">
        <ul>
          <li>
            <Link className="block text-orange-900 py-2" href="/">
              Home
            </Link>
          </li>
          <li>
            <Link className="block text-orange-900 py-2" href="/Clips">
              Clips
            </Link>
          </li>
          <li>
            <Link className="block text-orange-900 py-2" href="/Notes">
              Notes
            </Link>
          </li>
          <li>
            <Link className="block text-orange-900 py-2" href="/study">
             Study
            </Link>
          </li>
          <li>
            <Link className="block text-orange-900 py-2" href="/contact">
              Contact
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
    </>
  );
}
