export default function TextAvatar({ nickname, size = 40 }) {
    const getInitial = (name: string) => {
      if (!name) return "?";
      return name.length >= 2 ? name.slice(0, 2) : name[0];
    };
  
    const colors = ["#FFB6C1", "#FFD700", "#87CEFA", "#98FB98", "#FFA07A"];
    const colorIndex = [...nickname].reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
    const bgColor = colors[colorIndex];
  
    return (
      <div
        style={{
          width: size,
          height: size,
          backgroundColor: bgColor,
          borderRadius: "50%",
        }}
        className="flex items-center justify-center text-white font-bold select-none text-base"
      >
        {getInitial(nickname)}
      </div>
    );
  }
  