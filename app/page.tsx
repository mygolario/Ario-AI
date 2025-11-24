import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.hero}>
      <div className={styles.card}>
        <p className={styles.tagline}>Phase 1 · Option C-1</p>
        <h1 className={styles.title}>Iran AI Assistant – MVP</h1>
        <p className={styles.subtitle}>
          یک همراه فارسی‌زبان برای کاربران ایرانی: پاسخ‌های کاربردی درباره فرهنگ،
          قوانین و نیازهای روزمره، با حفظ حریم خصوصی و سادگی تجربه کاربری.
        </p>
        <Link href="/app" className={styles.cta}>
          ورود به دستیار
        </Link>
      </div>
    </main>
  );
}
