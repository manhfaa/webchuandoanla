import { TeamMember } from "@/types";

export const teamMembers: TeamMember[] = [
  {
    id: "pham-tuan-minh",
    name: "Phạm Tuấn Minh",
    role: "Media & giám sát triển khai",
    description: "Phụ trách truyền thông, kiểm tra độ tin cậy thông tin và theo dõi tác động sau khi sản phẩm được triển khai.",
    responsibilities: ["Media", "Kiểm tra thông tin", "Giám sát sau triển khai"],
    presentationFocus: ["Kiểm chứng nội dung", "Truyền thông sản phẩm", "Theo dõi phản hồi cộng đồng"],
    avatar: "/avatars/pham-tuan-minh.png",
  },
  {
    id: "pham-duc-manh",
    name: "Phạm Đức Mạnh",
    role: "AI nhận diện bệnh lá",
    description: "Xây dựng giá trị công nghệ của Agromind AI thông qua mô hình nhận diện bệnh lá và luồng xử lý ảnh bằng CNN.",
    responsibilities: ["AI nhận diện bệnh lá", "Chuyển đổi số", "Giá trị công nghệ"],
    presentationFocus: ["Mô hình nhận diện ảnh lá", "Luồng xử lý AI", "Ứng dụng công nghệ vào nông nghiệp"],
    avatar: "/avatars/pham-duc-manh.png",
  },
  {
    id: "le-hoang-son",
    name: "Lê Hoàng Sơn",
    role: "Website full-stack",
    description: "Phụ trách hệ thống website, đảm bảo sản phẩm vận hành mạch lạc từ giao diện đến dữ liệu.",
    responsibilities: ["Website", "Backend", "Frontend"],
    presentationFocus: ["Giao diện người dùng", "Backend và dữ liệu", "Trải nghiệm thao tác trên web"],
    avatar: "/avatars/le-hoang-son.png",
  },
  {
    id: "nguyen-thi-thu-trang",
    name: "Nguyễn Thị Thu Trang",
    role: "Khảo sát nhu cầu thực tế",
    description: "Tập trung khảo sát vấn đề của người dùng Việt Nam, xác định nhu cầu thật và nhóm đối tượng sử dụng chính.",
    responsibilities: ["Khảo sát nhu cầu", "Phân tích người dùng", "Xác định đối tượng sử dụng"],
    presentationFocus: ["Khảo sát nhu cầu", "Phân tích người dùng", "Xác định nhóm sử dụng chính"],
    avatar: "/avatars/nguyen-thi-thu-trang.png",
  },
  {
    id: "dinh-my-uyen",
    name: "Đinh Mỹ Uyên",
    role: "Tester",
    description: "Kiểm thử sản phẩm từ góc nhìn người dùng, tập trung vào trải nghiệm, độ dễ dùng và các lỗi cần hoàn thiện.",
    responsibilities: ["Kiểm thử", "Trải nghiệm người dùng", "Đánh giá tính dễ dùng"],
    presentationFocus: ["Kiểm thử tính năng", "Đánh giá trải nghiệm", "Góp ý cải thiện giao diện"],
    avatar: "/avatars/dinh-my-uyen.png",
  },
];
