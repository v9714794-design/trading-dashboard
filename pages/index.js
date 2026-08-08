import Head from 'next/head';
import TradingDashboard from '../components/TradingDashboard';

export default function Home() {
  return (
    <>
      <Head>
        <title>Macro Terminal by Vinay</title>
        <meta name="description" content="Live macro, crypto, and markets dashboard" />
      </Head>
      <TradingDashboard />
    </>
  );
}
