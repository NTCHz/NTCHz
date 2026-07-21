# CLAUDE.md

{1 บรรทัด: repo นี้คืออะไร}

## Commands

```bash
{dev}      # {หมายเหตุถ้ามี เช่น port}
{test}     # ต้องผ่านก่อน commit
{lint}
{build}
```

## Structure

{5-10 บรรทัด: โฟลเดอร์ไหนทำอะไร — เฉพาะที่ไม่ obvious จากชื่อ}

```
src/services/   # data access ทั้งหมด — component ห้ามเรียก API ตรง
src/components/ # ...
```

## Conventions

{เฉพาะที่ agent เดาผิดได้ — กติกาที่ต่างจาก default:}

- {เช่น: type not interface}
- {เช่น: githooks not husky}
- {เช่น: state ใช้ nanostores, server state ใช้ TanStack Query}

## Gotchas

- {test ตัวไหน flaky, env ไหนห้ามแตะ, ของที่ดูพังแต่ไม่พัง}
- {DB dump / seed อยู่ไหน restore ยังไง}

<!-- หลัก: สั้น + เจาะจง. รายละเอียดเฉพาะทางแยกไฟล์ใน docs/ แล้วชี้ลิงก์แทน.
     agent ทำพลาดซ้ำเรื่องไหน → เพิ่มกติกาเรื่องนั้น. section ว่างตลอด → ตัดทิ้ง. -->
