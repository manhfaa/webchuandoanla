/**
 * Brand copy, with an English sibling for every line a visitor can read.
 *
 * The Vietnamese fields stay the source for structured data and page metadata
 * (`structured-data.tsx` declares `inLanguage: "vi-VN"`), so a crawler keeps
 * reading Vietnamese no matter which language the visitor has selected. The
 * `*En` fields are for the rendered UI, picked up through `tr(...)` the same
 * way the plan, plant and team records do it.
 *
 * `name` has no translation on purpose: it is the brand.
 */
export const brand = {
  name: "Agromind AI",
  slogan: "Hiểu chiếc lá, chăm cả khu vườn.",
  sloganEn: "Read the leaf, care for the whole garden.",
  description:
    "Trợ lý nông nghiệp giúp người trồng kiểm tra ảnh lá, đối chiếu triệu chứng và theo dõi việc chăm sóc cây theo thời gian.",
  descriptionEn:
    "A farming assistant that helps growers check leaf photos, cross-check symptoms and follow their plant care over time.",
  mission:
    "Agromind AI giúp người trồng quan sát tình trạng lá có hệ thống, hiểu rõ việc nên làm tiếp theo và lưu lại quá trình chăm sóc của khu vườn.",
  missionEn:
    "Agromind AI helps growers watch leaf health systematically, understand what to do next and keep a record of how their garden has been cared for.",
};

/** The company behind the product. Named on the landing page and in the footer;
 *  no address or registration number is shown because none has been supplied. */
export const DEVELOPER = "DIEPTEK";
