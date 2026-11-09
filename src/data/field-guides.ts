import { landingPhotos, type LandingPhoto } from "@/constants/landing-photos";

type Localized = { vi: string; en: string };

export type FieldGuide = {
  slug: string;
  cropSlug: string;
  title: Localized;
  summary: Localized;
  photo: LandingPhoto;
  photoAlt: Localized;
  photoNote: Localized;
  signs: Localized[];
  lookalikes: Localized[];
  actions: Localized[];
  escalation: Localized;
  sources: { name: string; url: string }[];
};

export const FIELD_GUIDES: FieldGuide[] = [
  {
    slug: "dom-la-septoria-ca-chua",
    cropSlug: "ca-chua",
    title: { vi: "Lá cà chua nhiều đốm nhỏ: phân biệt Septoria", en: "Small spots on tomato leaves: checking for Septoria" },
    summary: {
      vi: "Bắt đầu từ lá thấp, quan sát kích thước và hình dạng vết đốm, rồi đối chiếu với cháy lá sớm và đốm vi khuẩn trước khi kết luận.",
      en: "Start with lower leaves, compare spot size and shape, then rule out early blight and bacterial spot before drawing a conclusion.",
    },
    photo: landingPhotos.heroTomato,
    photoAlt: { vi: "Lá cà chua có nhiều đốm nâu nhỏ", en: "Tomato leaf with many small brown spots" },
    photoNote: {
      vi: "Ảnh minh họa lá cà chua được ghi nhận có đốm Septoria; ảnh của cây bạn vẫn cần được đánh giá riêng.",
      en: "A documented Septoria leaf photo; your own plant still needs a separate assessment.",
    },
    signs: [
      { vi: "Kiểm tra lá thấp gần đất trước: nhiều bệnh đốm lá bắt đầu ở đây khi đất hoặc nước bắn lên lá.", en: "Inspect lower leaves first: several leaf-spot problems begin there after soil or water splashes onto foliage." },
      { vi: "Septoria thường tạo nhiều đốm nhỏ, tâm nhạt màu hơn viền; theo dõi xem lá vàng dần quanh các đốm hay không.", en: "Septoria often forms many small spots with paler centers; watch for yellowing around them." },
      { vi: "Chụp cả mặt trên, mặt dưới lá và toàn cây, ghi ngày chụp để thấy vết mới xuất hiện hay đang lan rộng.", en: "Photograph both sides of a leaf and the whole plant; date the photos so you can detect new or spreading spots." },
    ],
    lookalikes: [
      { vi: "Cháy lá sớm thường có vết lớn hơn với các vòng đồng tâm như bia bắn; đừng gọi mọi đốm nâu là Septoria.", en: "Early blight often has larger lesions with target-like concentric rings; not every brown spot is Septoria." },
      { vi: "Đốm vi khuẩn trên cà chua có thể trông tương tự lúc đầu; vết trên quả hoặc nhiều phần cây là manh mối cần kiểm tra thêm.", en: "Bacterial spot can look similar early on; spots on fruit or other plant parts are clues to investigate further." },
    ],
    actions: [
      { vi: "Tách lá có triệu chứng khỏi lá lành khi thao tác, vệ sinh tay và dụng cụ; tránh làm việc trên cây lúc lá còn ướt.", en: "Avoid transferring material from affected leaves to healthy ones, clean hands and tools, and avoid working while foliage is wet." },
      { vi: "Tưới sát gốc thay vì phun lên tán, giữ thông thoáng và kiểm tra lại lá thấp sau vài ngày.", en: "Water at the base rather than over foliage, improve airflow, and recheck lower leaves after a few days." },
      { vi: "Không loại bỏ quá nhiều lá một lúc; nếu bệnh lan nhanh hoặc diện tích trồng lớn, hỏi cán bộ kỹ thuật địa phương.", en: "Do not remove too much foliage at once; seek local technical advice if symptoms spread quickly or the planting is extensive." },
    ],
    escalation: {
      vi: "Ảnh lá không xác định chắc tác nhân gây bệnh. Nếu vết lan sang thân, quả hoặc nhiều cây, cần kiểm tra tại vườn trước khi chọn biện pháp xử lý, đặc biệt là thuốc bảo vệ thực vật.",
      en: "A leaf photo cannot confirm the causal agent. If spots reach stems, fruit, or many plants, arrange an on-site check before choosing a treatment, especially a pesticide.",
    },
    sources: [
      { name: "University of Minnesota Extension — Tomato leaf spot diseases", url: "https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/yard-and-garden-problems/tomato-leaf-spot-diseases" },
      { name: "University of Minnesota Extension — Early blight in tomato and potato", url: "https://extension.umn.edu/agriculture/specialty-crops/vegetable-farming/disease-management/early-blight-in-tomato-and-potato" },
    ],
  },
  {
    slug: "dom-vi-khuan-ot-chuong",
    cropSlug: "ot-chuong",
    title: { vi: "Lá ớt chuông có đốm nâu: khi nào nghĩ đến đốm vi khuẩn?", en: "Brown spots on bell pepper leaves: could it be bacterial spot?" },
    summary: {
      vi: "Nhìn cả lá dưới, quả và điều kiện ẩm ướt. Đốm vi khuẩn chỉ là một khả năng; vết đốm giống nhau có thể đến từ nguyên nhân khác.",
      en: "Check lower leaves, fruit, and wet conditions. Bacterial spot is one possibility; similar-looking spots can have other causes.",
    },
    photo: landingPhotos.featurePepper,
    photoAlt: { vi: "Lá ớt có những đốm nâu nhỏ", en: "Pepper leaf with small brown spots" },
    photoNote: {
      vi: "Ảnh tham khảo bệnh đốm vi khuẩn trên ớt; không dùng một ảnh để xác nhận mọi trường hợp tương tự.",
      en: "Reference photo of bacterial spot on pepper; one image does not confirm every similar case.",
    },
    signs: [
      { vi: "Tìm những đốm nâu nhỏ, khá tròn, có viền sẫm; lá thấp có thể biểu hiện sớm và nặng hơn.", en: "Look for small, fairly round brown spots with darker margins; lower leaves may show the earliest or strongest signs." },
      { vi: "Quan sát quả: các nốt nâu gồ, sần có thể củng cố nghi ngờ, nhưng riêng vết lá không đủ kết luận.", en: "Examine fruit: raised, corky brown spots may support suspicion, but leaf marks alone are insufficient." },
      { vi: "Ghi nhận mưa, tưới phun và thời điểm xuất hiện vì nước bắn và thao tác trên cây ướt có thể làm bệnh lan.", en: "Record rain, overhead watering, and when symptoms appeared; splashing water and work on wet plants can spread disease." },
    ],
    lookalikes: [
      { vi: "Bệnh do Phytophthora có thể làm lá có vùng úng nước, quả bị mềm và cả cây héo nhanh; đây là tình huống cần đánh giá sớm.", en: "Phytophthora can cause water-soaked leaf and fruit lesions plus rapid wilting; that pattern warrants prompt assessment." },
      { vi: "Lá khảm vàng xanh, biến dạng hoặc cây còi cọc gợi ý cần kiểm tra nhóm virus thay vì chỉ nhìn vết đốm.", en: "Mottling, distorted leaves, or stunting suggest checking for viruses rather than focusing only on spots." },
    ],
    actions: [
      { vi: "Đánh dấu cây có triệu chứng và chụp lại cùng vị trí sau vài ngày để biết bệnh có lan không.", en: "Mark affected plants and photograph the same area a few days later to check for spread." },
      { vi: "Hạn chế nước bắn lên lá, tưới vào gốc, rửa tay và dụng cụ sau khi chạm cây nghi bệnh.", en: "Reduce splashing on leaves, water at the base, and clean hands and tools after handling suspect plants." },
      { vi: "Không tự chọn thuốc chỉ dựa vào kết quả ảnh; cần xác định nguyên nhân tại vườn và dùng sản phẩm đúng nhãn địa phương nếu chuyên gia khuyến nghị.", en: "Do not choose a spray from a photo result; establish the cause on-site and follow local product labels if an expert recommends treatment." },
    ],
    escalation: {
      vi: "Nếu đốm xuất hiện trên nhiều cây hoặc quả, cây héo nhanh, hãy liên hệ cán bộ bảo vệ thực vật địa phương. Triệu chứng tương tự có thể cần xét nghiệm để phân biệt.",
      en: "If many plants or fruit are affected, or plants wilt rapidly, contact a local crop protection specialist. Similar symptoms may require testing to distinguish.",
    },
    sources: [
      { name: "University of Minnesota Extension — Bacterial spot of tomato and pepper", url: "https://extension.umn.edu/agriculture/specialty-crops/vegetable-farming/disease-management/bacterial-spot-of-tomato-and-pepper" },
      { name: "University of Minnesota Extension — Pepper leaf symptom guide", url: "https://apps.extension.umn.edu/garden/diagnose/plant/vegetable/pepper/leavesspots.html" },
    ],
  },
  {
    slug: "la-nho-co-moc-trang",
    cropSlug: "nho",
    title: { vi: "Lá nho có mảng vàng hoặc mốc trắng: phấn trắng hay sương mai?", en: "Yellow patches or white growth on grape leaves: which mildew?" },
    summary: {
      vi: "Không phải mọi vệt trắng là cùng một bệnh. Hãy so mặt trên và mặt dưới lá, vùng vàng tương ứng, rồi kiểm tra chùm quả.",
      en: "Not all white growth is the same disease. Compare upper and lower leaf surfaces, matching yellow patches, and fruit clusters." },
    photo: landingPhotos.storyGrape,
    photoAlt: { vi: "Lá nho có vùng đổi màu và dấu hiệu mốc", en: "Grape leaf with discolored patches and mildew-like signs" },
    photoNote: {
      vi: "Ảnh minh họa lá nho có dấu hiệu mốc; nguồn ảnh không xác nhận đây là phấn trắng hay sương mai.",
      en: "Illustrative grape leaf with mildew-like signs; the photo source does not confirm powdery or downy mildew.",
    },
    signs: [
      { vi: "Phấn trắng thường biểu hiện thành lớp bột trắng xám trên bề mặt lá hoặc quả; lá non có thể biến dạng.", en: "Powdery mildew often appears as a gray-white powdery coating on leaves or fruit; young leaves can distort." },
      { vi: "Sương mai có thể bắt đầu bằng mảng vàng xanh như vết dầu ở mặt trên, còn mặt dưới có lớp tơ trắng trong điều kiện ẩm.", en: "Downy mildew may begin with yellow-green oily patches above and white cottony growth underneath in humid conditions." },
      { vi: "Chụp cùng một vùng ở cả hai mặt lá và ghi vị trí trong tán; một ảnh chụp từ xa dễ bỏ lỡ mặt dưới.", en: "Photograph the same patch from both sides and note its position in the canopy; distant photos easily miss the underside." },
    ],
    lookalikes: [
      { vi: "Đốm nâu viền sẫm hoặc quả khô đen không nên tự gán là bệnh mốc; nho còn có bệnh đốm lá và thối đen.", en: "Brown spots with dark borders or shriveled black fruit should not be labeled mildew automatically; grapes also get leaf spots and black rot." },
      { vi: "Bụi bám hoặc dư lượng trên lá cũng có thể trông trắng trong ảnh. Quan sát trực tiếp nhiều lá trước khi kết luận.", en: "Dust or residue can also look white in photos. Inspect multiple leaves in person before deciding." },
    ],
    actions: [
      { vi: "Theo dõi các chồi non và chùm quả, ghi lại thời tiết ẩm và vị trí bệnh xuất hiện đầu tiên.", en: "Monitor young shoots and clusters, and record humid weather and where signs first appeared." },
      { vi: "Giữ tán thông thoáng bằng cách chăm sóc phù hợp, thu gom lá và quả bệnh rụng; tránh làm tổn thương cây khi thao tác.", en: "Maintain airflow through appropriate canopy care and remove fallen affected leaves and fruit without damaging the vine." },
      { vi: "Nếu định can thiệp bằng thuốc, hỏi kỹ thuật viên địa phương để xác định đúng bệnh và tuân thủ nhãn tại Việt Nam.", en: "Before using a pesticide, ask a local technician to identify the disease and follow the product label in Vietnam." },
    ],
    escalation: {
      vi: "Khi nhiều chùm quả hoặc chồi non bị ảnh hưởng, cần kiểm tra tại vườn sớm. AI và ảnh minh họa không thay thế được xác định bệnh trực tiếp.",
      en: "Seek an early on-site assessment if several clusters or young shoots are affected. AI and illustrative photos cannot replace direct identification.",
    },
    sources: [
      { name: "University of Minnesota Extension — Growing grapes in the home garden", url: "https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/growing-grapes-in-the-home-garden" },
      { name: "University of Minnesota Extension — Grape leaf symptom guide", url: "https://apps.extension.umn.edu/garden/diagnose/plant/fruit/grape/leavesspots.html" },
      { name: "Penn State Extension — Grape disease: downy mildew", url: "https://extension.psu.edu/grape-disease-downy-mildew" },
    ],
  },
];

export function findFieldGuide(slug: string) {
  return FIELD_GUIDES.find((guide) => guide.slug === slug);
}
