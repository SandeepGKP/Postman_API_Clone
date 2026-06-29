import Sidebar from '@/components/workspace/Sidebar';
import RequestBuilder from '@/components/workspace/RequestBuilder';
import Topbar from '@/components/workspace/Topbar';
import ToastContainer from '@/components/workspace/ToastContainer';

export default function Home() {
  return (
    <div className="flex h-screen w-full flex-col bg-[#212121] text-gray-200 font-sans overflow-hidden">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 min-w-0 flex flex-col bg-[#1E1E1E] border-l border-[#333333]">
          <RequestBuilder />
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
