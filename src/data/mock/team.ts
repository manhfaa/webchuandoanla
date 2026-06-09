import { TeamMember } from "@/types";

export const teamMembers: TeamMember[] = [
  {
    id: "pham-tuan-minh",
    name: "Phạm Tuấn Minh",
    role: "Media & giám sát triển khai",
    description: "Phụ trách truyền thông, kiểm tra độ tin cậy thông tin và theo dõi tác động sau khi sản phẩm được triển khai.",
    responsibilities: ["Media", "Kiểm tra thông tin", "Giám sát sau triển khai"],
    presentationFocus: ["Dẫn chuyện", "Kiểm chứng thông tin", "Truyền thông", "Tác động cộng đồng"],
    avatar: "/avatars/pham-tuan-minh.png",
  },
  {
    id: "pham-duc-manh",
    name: "Phạm Đức Mạnh",
    role: "AI nhận diện bệnh lá",
    description: "Xây dựng giá trị công nghệ của Agromind AI thông qua mô hình nhận diện bệnh lá và luồng xử lý ảnh bằng CNN.",
    responsibilities: ["AI nhận diện bệnh lá", "Chuyển đổi số", "Giá trị công nghệ"],
    presentationFocus: ["Giải thích AI/CNN", "Luồng xử lý ảnh", "Giá trị công nghệ"],
    avatar: "/avatars/pham-duc-manh.png",
  },
  {
    id: "le-hoang-son",
    name: "Lê Hoàng Sơn",
    role: "Website full-stack",
    description: "Phụ trách website, backend và frontend, đảm bảo sản phẩm vận hành mạch lạc từ giao diện đến dữ liệu.",
    responsibilities: ["Website", "Backend", "Frontend"],
    presentationFocus: ["Demo website", "Giải thích vận hành", "Hướng dẫn thao tác sử dụng"],
    avatar: "/avatars/le-hoang-son.png",
  },
  {
    id: "nguyen-thi-thu-trang",
    name: "Nguyễn Thị Thu Trang",
    role: "Khảo sát nhu cầu thực tế",
    description: "Tập trung khảo sát vấn đề của người dùng Việt Nam, xác định nhu cầu thật và nhóm đối tượng sử dụng chính.",
    responsibilities: ["Khảo sát nhu cầu", "Phân tích người dùng", "Xác định đối tượng sử dụng"],
    presentationFocus: ["Vấn đề người dùng", "Nhu cầu thật", "Đối tượng sử dụng"],
    avatar: "/avatars/member-5.svg",
  },
  {
    id: "dinh-my-uyen",
    name: "Đinh Mỹ Uyên",
    role: "Tester",
    description: "Kiểm thử sản phẩm từ góc nhìn người dùng, tập trung vào trải nghiệm, độ dễ dùng và các lỗi cần hoàn thiện.",
    responsibilities: ["Kiểm thử", "Trải nghiệm người dùng", "Đánh giá tính dễ dùng"],
    presentationFocus: ["Kiểm thử", "Trải nghiệm người dùng", "Tính dễ dùng"],
    avatar: "/avatars/member-4.svg",
  },
];
