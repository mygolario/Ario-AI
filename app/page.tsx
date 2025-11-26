import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.hero}>
      <div className={styles.card}>
        <p className={styles.tagline}>دستیار هوش مصنوعی فارسی‌زبان</p>
        <h1 className={styles.title}>Ario AI</h1>
        <p className={styles.subtitle}>
          دستیار هوشمند شما برای پاسخ به سوالات روزمره، اطلاعات فرهنگی و راهنمایی‌های کاربردی
        </p>
        <Link href="/app" className={styles.cta}>
          شروع گفتگو
        </Link>
      </div>
    </main>
  );
}
