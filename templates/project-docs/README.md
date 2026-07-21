# Project Docs Templates

ชุด markdown templates สำหรับเริ่มโปรเจ็คใหม่ — ออกแบบสำหรับ workflow ที่ใช้ AI coding agent (Claude Code) เป็นหลัก

## ใช้ยังไง

Copy ไฟล์ที่ต้องใช้ลง repo แล้ว rename ตัด `.template` ออก:

| Template | ปลายทาง | มีไว้ทำไม |
|---|---|---|
| `README.template.md` | `README.md` | สำหรับคน: setup, run, deploy |
| `CLAUDE.template.md` | `CLAUDE.md` | สำหรับ agent: commands, conventions, gotchas |
| `SPEC.template.md` | `docs/SPEC-<feature>.md` | ต่อ feature ใหญ่: goal, scope, acceptance |
| `DECISIONS.template.md` | `docs/DECISIONS.md` | ไฟล์เดียว append decision ลงเรื่อยๆ |
| `HANDOFF.template.md` | `docs/HANDOFF.md` | session state — เขียน/อ่านผ่าน `/handoff` skill |

## หลักการ (จาก best practices ที่ verify แล้ว)

- **สั้น + เจาะจง ชนะ ยาว + กว้าง** — "use type not interface" ใช้ได้จริง, "write clean code" ไร้ค่า
- **Forward-looking** — handoff เขียนเพื่อ session หน้า ไม่ใช่บันทึกอดีต งานที่เสร็จกู้จาก git ได้
- **ไม่ซ้ำซ้อน** — อะไรที่ git log หรือโค้ดบอกอยู่แล้ว ไม่ต้องเขียนลง docs
- **CLAUDE.md เบา ชี้ไฟล์ลูก** — อย่ายัดทุกอย่างไฟล์เดียว เปลือง context โหลดของไม่เกี่ยว
- **Section ไหนว่างตลอด → ตัดทิ้ง** — template ปรับตามรอยใช้จริง ไม่ใช่ตามทฤษฎี

ลำดับความคุ้มถ้าเริ่มทีละไฟล์: `CLAUDE.md` > `SPEC` > `README` > `DECISIONS`
