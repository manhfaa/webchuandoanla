/**
 * Neo cho từng mục bệnh trên trang /benh-cay/[slug].
 *
 * Dùng chung giữa phần hiển thị và phần sinh JSON-LD: schema khai báo URL nào
 * thì trang phải có đúng neo đó. Nếu hai bên tự tính riêng, chỉ cần một bên đổi
 * là Google nhận một mục lục trỏ vào hư không — đúng loại dữ liệu sai lệch mà
 * Google phạt.
 *
 * Tên bệnh trong src/data/crop-diseases.ts chỉ có tiếng Việt và do generator
 * sinh ra, nên không đổi theo ngôn ngữ người dùng chọn.
 */
export function diseaseSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Thêm hậu tố khi hai bệnh của cùng một cây rút gọn ra trùng nhau, để mỗi mục
 * luôn có một neo riêng.
 */
export function diseaseAnchors(names: string[]): string[] {
  const used = new Map<string, number>();
  return names.map((name) => {
    const base = diseaseSlug(name) || "benh";
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen + 1}`;
  });
}
