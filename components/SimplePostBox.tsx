export default function SimplePostBox() {
  return (
    <div className="p-6 max-w-xl ">
      <h2 className="text-2xl font-normal mb-4">Write a new post</h2>
      <textarea
        placeholder="Write something..."
        className="w-full h-32 p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      ></textarea>

      <button className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition">
        Submit
      </button>
    </div>
  );
}
