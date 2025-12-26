# Waqf Application - User Credentials

## 📋 Summary

- **Total Districts**: 28
- **Total Users**: 32
  - 1 Admin
  - 28 Inspectors (one per district)
  - 2 Accounts Officers
  - 1 Reports Officer

---

## 🔐 Admin Login

**Email**: `admin@waqf.ap.gov.in`
**Password**: `Admin@123456`
**Role**: Admin
**Full Name**: System Administrator

---

## 👮 Inspector Logins (28 Users)

Each inspector is assigned to one district. Password format: `Inspector@[DISTRICT_CODE]123`

| District | Code | Email | Password | Full Name |
|----------|------|-------|----------|-----------|
| Adoni | ADO | inspector.adoni@waqf.ap.gov.in | Inspector@ADO123 | Inspector - Adoni |
| Alluri Seetaramaraju | ASR | inspector.alluri.seetaramaraju@waqf.ap.gov.in | Inspector@ASR123 | Inspector - Alluri Seetaramaraju |
| Anakapalli | AKP | inspector.anakapalli@waqf.ap.gov.in | Inspector@AKP123 | Inspector - Anakapalli |
| Anantapuramu | ATP | inspector.anantapuramu@waqf.ap.gov.in | Inspector@ATP123 | Inspector - Anantapuramu |
| Annamayya | ANN | inspector.annamayya@waqf.ap.gov.in | Inspector@ANN123 | Inspector - Annamayya |
| Bapatla | BAP | inspector.bapatla@waqf.ap.gov.in | Inspector@BAP123 | Inspector - Bapatla |
| Chittoor | CHT | inspector.chittoor@waqf.ap.gov.in | Inspector@CHT123 | Inspector - Chittoor |
| Dr. B.R. A.Konaseema | KNS | inspector.dr..b.r..a.konaseema@waqf.ap.gov.in | Inspector@KNS123 | Inspector - Dr. B.R. A.Konaseema |
| East Godavari | EGD | inspector.east.godavari@waqf.ap.gov.in | Inspector@EGD123 | Inspector - East Godavari |
| Eluru | ELU | inspector.eluru@waqf.ap.gov.in | Inspector@ELU123 | Inspector - Eluru |
| Guntur | GNT | inspector.guntur@waqf.ap.gov.in | Inspector@GNT123 | Inspector - Guntur |
| Kakinada | KKD | inspector.kakinada@waqf.ap.gov.in | Inspector@KKD123 | Inspector - Kakinada |
| Krishna | KRS | inspector.krishna@waqf.ap.gov.in | Inspector@KRS123 | Inspector - Krishna |
| Kurnool | KRN | inspector.kurnool@waqf.ap.gov.in | Inspector@KRN123 | Inspector - Kurnool |
| Nandyal | NDY | inspector.nandyal@waqf.ap.gov.in | Inspector@NDY123 | Inspector - Nandyal |
| Nellore | NLR | inspector.nellore@waqf.ap.gov.in | Inspector@NLR123 | Inspector - Nellore |
| NTR | NTR | inspector.ntr@waqf.ap.gov.in | Inspector@NTR123 | Inspector - NTR |
| Palnadu | PLN | inspector.palnadu@waqf.ap.gov.in | Inspector@PLN123 | Inspector - Palnadu |
| Parvathipuram | PVP | inspector.parvathipuram@waqf.ap.gov.in | Inspector@PVP123 | Inspector - Parvathipuram |
| Prakasam | PRK | inspector.prakasam@waqf.ap.gov.in | Inspector@PRK123 | Inspector - Prakasam |
| Sri Sathya Sai | SSS | inspector.sri.sathya.sai@waqf.ap.gov.in | Inspector@SSS123 | Inspector - Sri Sathya Sai |
| Srikakulam | SKL | inspector.srikakulam@waqf.ap.gov.in | Inspector@SKL123 | Inspector - Srikakulam |
| Tirupati | TPT | inspector.tirupati@waqf.ap.gov.in | Inspector@TPT123 | Inspector - Tirupati |
| Vijayanagaram | VZM | inspector.vijayanagaram@waqf.ap.gov.in | Inspector@VZM123 | Inspector - Vijayanagaram |
| Vijayawada | VJA | inspector.vijayawada@waqf.ap.gov.in | Inspector@VJA123 | Inspector - Vijayawada |
| Visakhapatnam | VSP | inspector.visakhapatnam@waqf.ap.gov.in | Inspector@VSP123 | Inspector - Visakhapatnam |
| West Godavari | WGD | inspector.west.godavari@waqf.ap.gov.in | Inspector@WGD123 | Inspector - West Godavari |
| YSR Kadapa District | KDP | inspector.ysr.kadapa.district@waqf.ap.gov.in | Inspector@KDP123 | Inspector - YSR Kadapa District |

---

## 💰 Accounts Logins (2 Users)

**Accounts Officer 1**
- **Email**: `accounts1@waqf.ap.gov.in`
- **Password**: `Accounts@123456`
- **Full Name**: Accounts Officer 1

**Accounts Officer 2**
- **Email**: `accounts2@waqf.ap.gov.in`
- **Password**: `Accounts@123456`
- **Full Name**: Accounts Officer 2

---

## 📊 Reports Login

**Email**: `reports@waqf.ap.gov.in`
**Password**: `Reports@123456`
**Role**: Reports
**Full Name**: Reports Officer

---

## 📍 Districts List with Codes

1. Adoni (ADO)
2. Alluri Seetaramaraju (ASR)
3. Anakapalli (AKP)
4. Anantapuramu (ATP)
5. Annamayya (ANN)
6. Bapatla (BAP)
7. Chittoor (CHT)
8. Dr. B.R. A.Konaseema (KNS)
9. East Godavari (EGD)
10. Eluru (ELU)
11. Guntur (GNT)
12. Kakinada (KKD)
13. Krishna (KRS)
14. Kurnool (KRN)
15. Nandyal (NDY)
16. Nellore (NLR)
17. NTR (NTR)
18. Palnadu (PLN)
19. Parvathipuram (PVP)
20. Prakasam (PRK)
21. Sri Sathya Sai (SSS)
22. Srikakulam (SKL)
23. Tirupati (TPT)
24. Vijayanagaram (VZM)
25. Vijayawada (VJA)
26. Visakhapatnam (VSP)
27. West Godavari (WGD)
28. YSR Kadapa District (KDP)

---

## 🔒 Security Notes

⚠️ **Important**:
- All passwords follow a consistent pattern for easy management
- Change passwords in production environment
- All users have email_confirmed_at set, so no email verification required
- Each inspector is assigned to exactly one district
- All users are ready to use immediately

---

## ✅ Database Status

- ✅ 28 Districts created with codes
- ✅ 1 Admin user created
- ✅ 28 Inspector users created (one per district)
- ✅ 2 Accounts users created
- ✅ 1 Reports user created
- ✅ All profiles linked to auth users
- ✅ All inspectors assigned to their districts

**Total**: 32 users ready for login




