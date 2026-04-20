#!/usr/bin/env python3
"""
import-presale.py — Import presale/airdrop recipients into the identity store.

Tags each wallet with:
  presale: true
  presale_quantity: N   (total tokens airdropped, summed across duplicate rows)
  twitter: handle       (only set if not already present; source = "presale_list")

Usage:
    python3 scripts/import-presale.py
"""

import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

IDENTITY_FILE = Path.home() / ".openclaw" / "holders-identity.jsonl"

# ── Presale data ───────────────────────────────────────────────────────────────

PRESALE_RAW = """
0xF74f8aD40B17887B0379D87C55C063DC2861aA2F\t1\tPharmDRogers87
0x77039399801F462B4ed13444A266b16355C471bF\t1\tpinstripedgator
0xdceEDFC73CFa846Ec64e67491DfE7C9047476827\t5\tipumpcharts
0x0dE6347E2C27500E61AFf50A769d8B881dE46CE8\t3\tTonerre_lol
0xc49A90fEA8fd501AEE2c277231de1C13C06946eF\t2\tLawalHa97240849
0x31d74ad414C5Bd19657fadb9AD1FdaA90D01EEC6\t1\tlowelohs
0x2f501851BbD8E8F60aFaC64E8fb902Ff4CD37084\t3\tcyb0rg
0xEfb5788BB4904B5D5a94F8F191847547F80323C2\t2\tJsononchain
0x94eE254524824B5450C37fD008E127Dd2dB48b2e\t2\tDeanxCrypto
0xEa5f87D9F02aa5296Dd1807A2aF76654f5c16e76\t5\tjpegdigital
0x94eE254524824B5450C37fD008E127Dd2dB48b2e\t2\tDeanxCrypto
0x6316a7c591E73772C457Db369C475149f55b827e\t2\tmoonlyght_eth
0x774aB75Bc5D08F30AA207243a6B32105F1F1820b\t2\tKirillMiro19591
0x1316B011Cb086651c45A234c9E9E6B4237B9c10f\t3\tiamandyko
0xB1Ce2c57A6f8816113fd172A75fC3B9803320228\t10\tfoxslightly
0x4f5a54562056c331D5fAbF07dD1942470a82c363\t5\tcryptoking18181
0x31d74ad414C5Bd19657fadb9AD1FdaA90D01EEC6\t1\tlowelohs
0xA6d873e66874780a03C5Fd7fb86996bb310271bb\t1\tridazlp2
0x4fB7Fe1f4A5c73974f65CE2e0af429edc0B5420e\t2\tDustinStockton
0x9b213E99422C5b8D9Cf14b1fd41beB1381b67857\t2\txrisborg
0x6b0BE334AFB28B1794041Cd11209d5078D9d1D9e\t10\tfromgeek2chic
0x14066504a4A92A79F773C92f1e6B43bF62D46611\t10\tbalvant_regar
0x80fe625b67027f773413aD05448916276ABa323D\t3\tdrich26_onX
0xF74f8aD40B17887B0379D87C55C063DC2861aA2F\t3\tPharmDRogers87
0xb6682A81A8ed77d69cCD93374E94cBEe9C2fdFD9\t1\t2SN786
0xf620E7c097070bA66674d8E86b97351e71d7c96B\t5\tbrooklynog8
0xf620E7c097070bA66674d8E86b97351e71d7c96B\t5\tBrooklynog8
0x2d9d001cC285E48725D06c670FdFDCB6F16eC2E3\t1\tiz3r0zZ__
0xe3bFF512bED19287b11b49E4585Bc576083d6019\t10\tmidoustache
0x549bB507d1bA925751D6FeE5b629d8BF8A53Af06\t50\tbayc364
0x83ADA420F845d581F4e13660F63a32EAB5f66aB6\t9\t2577pink
0x2D5e18EF354Aa3199612914db47150Ec075305C5\t2\talit32
0x0dE6347E2C27500E61AFf50A769d8B881dE46CE8\t2\tTonerre_lol
0x16c07fA0c3b7bA4b51b5f3E6A7f7c90a5B1d835A\t1\tToron10Clktv
0xEe4d308cC1cde3DD0AdcB5A2c85EDFF22dB64918\t8\tlioncityape
0xD4D63033caEE5C25bE160c81d94b79335440cE7e\t2\tscottred350617
0x2D2637b1d5d5A92713478a3f688fFA12c57CeC79\t1\tLadyApeFundy
0xc2392C53Ea9c767333380e4b3e9d0E0044668F77\t1\tFundyApe3659
0x3D9Eb34938324969bD068e1362D0427438825B22\t5\tbailey_tattoo
0xef2CcDb65F276891fCc615DcDCbCAdE767c894E8\t5\tlawsonmc90
0xA0b969F6CEc948F383Fab53811e2b2C66D7c3af7\t22\t0x4rd
0xa38f55F8F991D7a46992D9D69DB9E01d690cd278\t3\tmushimdo
0xde724646DAe5ddD7D8Cf76Cdb55775Dc1e33B75d\t5\t1twothreetwo1
0x917A453b20dda213e3AB9C04BcE0c4a4ae197411\t4\tgryzzlgryzzl
0x2d9d001cC285E48725D06c670FdFDCB6F16eC2E3\t1\tiz3r0zZ__
0xd08Cc5cBD1012C6c4EF7a47c047dEC036d51D54F\t10\tgenesisdao_
0xF16005bE19a8CB12e02888123F4Ea749c1b7F322\t10\tjamesbad
0x31d74ad414C5Bd19657fadb9AD1FdaA90D01EEC6\t1\tlowelohs
0xc99c6e203A835BC7A911De174B4043Cabe3f2dF0\t3\tthechartpainter
0x4C7909d6F029b3a5798143C843F4f8e5341a3473\t1\tbonustrack
0x1915fd19E19858f815C924Df8D2d6e7065f1e547\t10\tCoB4n973
0x37583B534B103FE6162C209cE8da2026E4e84f79\t2\tanayazykova
0x2d9d001cC285E48725D06c670FdFDCB6F16eC2E3\t2\twutd
0x31d74ad414C5Bd19657fadb9AD1FdaA90D01EEC6\t1\tlowelohs
0x31d74ad414C5Bd19657fadb9AD1FdaA90D01EEC6\t1\tlowelohs
0x5a471c48dCDB9B47d30C0aaa6dE20346b2a66de9\t10\tmassinebnk
0xecBdE5878A4127b8DeF2AF355dc7e2be5311F904\t10\tMisix
0x5a471c48dCDB9B47d30C0aaa6dE20346b2a66de9\t10\tmassinebnk
0x633964154279399661AF668068A10E29b5570a15\t1\tsnerko
0xa8d67e13AC97cba918DeCdCD78f71fca8aB2d1a8\t1\trfdzi
0x2D5E03D9064A55B96d34290a176656398dF91379\t10\tdunnyy
0x04753Ee6B9653de1A201769FA270690500E36C78\t1\twhynotmeNFT
0x0c1Bd9C2019e206963A886A2c1E7a0F11A0b634e\t1\tcryptospaces1
0xdA28431f8c060E2a971209e29d0Ad1dFcC921746\t3\tchidobandito
0x95664898aB0f77D340cBB8F2862673cce5e906CA\t1\tjelena_crypto
0x3d4b8B62Fd71CBf84EEfd5f4E9756e66EB6A82CC\t3\tmonteluma
0x3270Cea8B063587e171B1234c058122C01277e7f\t1\tavant.arte
0x6d7e93dC6D159BDAC80955BA90b40AdBF3aF2bc7\t3\tcryptopenks
0xb5CB45A2e87Ce6e9f68Eef6722adcd8F9559Ab1c\t3\tiwijay24
0x579Ccb9ed8440c2397f75Eb33068cBeA581391b4\t3\tRaphaelbaumann7
0x0C94dD4e78b55C4b0b7630949fbc28705B2981Ef\t2\trubengg_eth
0xE0b3D8E605cA1a8cB28ceCA66B08f3049eBf7f49\t200\tfomo_the_fud
0xD4BCE9c082e315b8E3D0A79bFB5c6daA36e9531B\t5\tSKTheRealDeal
0x9BdEA57cF00Ae658D4dC67F5dA1172cd3196cC5B\t10\tdelbroko1979
0x69C7a78A1f48dE5676d23Ee7e800E36CD2Fb5EFf\t1\tseannana
0x720A4FaB08CB746fC90E88d1924a98104C0822Cf\t10\tTheKangFilms
0x3ec70D39ED50bfc9FCaD534cFF646DFD798BC7c5\t3\tpopsetsven
0xef2CcDb65F276891fCc615DcDCbCAdE767c894E8\t10\tlawsonmc90
0x45f6E731798684B1Cf9D980777c9d636E1064ffc\t3\tJuicetra
0x1f8a8aC54244E4016a376152b2F92D467552FA7B\t10\tshariq911
0x00Bd53913A82F36E5796Ed7D30F1B2a15cd31C20\t5\tstagflationusa
0x7ef4Eabd29436688DC4A58419A0575a100C1C134\t1\tboredapedad
0x720A4FaB08CB746fC90E88d1924a98104C0822Cf\t10\tTheKangFilms
0x1f8a8aC54244E4016a376152b2F92D467552FA7B\t10\tshariq911
0xcfD7854F2Ea95934296B3fdDE44C2bD50Eacd592\t1\tbeamgeist
0xf54e3Eec141204B90C1D520334c26d5D1e3c4b39\t1\tdtaghavi
0xcfBECd1ba28AF429C4063E33901F8c0Bd53eC9F1\t10\tbayc1k
0x1f16A0fC4a130c3436FE210cfB46E12F59f411dc\t1\tgnomeprincessx
0xa38f55F8F991D7a46992D9D69DB9E01d690cd278\t1\tmushimdo
0x98eFf980C57c9D333340b3856481bF7B8698987c\t1\tswampdaddy_
0xc968416370639A9B74B077A4a8f97076e4Ae1D9E\t1\t_legit_biscuit
""".strip()

# ── Parse ──────────────────────────────────────────────────────────────────────

def parse_presale(raw: str) -> dict:
    """Returns {wallet_lower: {qty, twitter}}"""
    by_wallet = defaultdict(lambda: {"qty": 0, "twitter": None})
    for line in raw.splitlines():
        parts = line.strip().split("\t")
        if len(parts) < 2:
            continue
        wallet = parts[0].strip().lower()
        qty    = int(parts[1].strip())
        tw     = parts[2].strip().lstrip("@") if len(parts) > 2 else ""
        # Skip non-ASCII / clearly invalid handles
        if tw and tw.isascii() and len(tw) <= 50:
            by_wallet[wallet]["twitter"] = tw  # last write wins (all rows same person)
        by_wallet[wallet]["qty"] += qty
    return dict(by_wallet)

# ── Load / save identity ────────────────────────────────────────────────────────

def load_identity() -> dict:
    identity = {}
    if not IDENTITY_FILE.exists():
        return identity
    with open(IDENTITY_FILE) as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    r = json.loads(line)
                    if r.get("wallet"):
                        identity[r["wallet"].lower()] = r
                except json.JSONDecodeError:
                    pass
    return identity


def save_identity(identity: dict):
    IDENTITY_FILE.parent.mkdir(parents=True, exist_ok=True)
    on_disk = {}
    if IDENTITY_FILE.exists():
        with open(IDENTITY_FILE) as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        r = json.loads(line)
                        if r.get("wallet"):
                            on_disk[r["wallet"].lower()] = r
                    except json.JSONDecodeError:
                        pass
    on_disk.update(identity)
    tmp = IDENTITY_FILE.with_suffix(".tmp")
    with open(tmp, "w") as f:
        for rec in on_disk.values():
            f.write(json.dumps(rec) + "\n")
    tmp.replace(IDENTITY_FILE)

# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    print("Presale Import")
    print("=" * 40)

    presale = parse_presale(PRESALE_RAW)
    print(f"Unique presale wallets: {len(presale)}")
    print(f"Total tokens airdropped: {sum(v['qty'] for v in presale.values())}")

    identity = load_identity()
    ts = datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    new_twitter  = 0
    already_had  = 0
    tagged       = 0

    for wallet, data in presale.items():
        if wallet not in identity:
            identity[wallet] = {"wallet": wallet}

        rec = identity[wallet]

        # Always set presale flag and quantity
        rec["presale"]          = True
        rec["presale_quantity"] = data["qty"]
        rec.setdefault("_sources", {})["presale"] = "presale_list"

        # Add Twitter if not present; if already present and matches, still tag source
        tw = data.get("twitter", "")
        if tw:
            existing = rec.get("twitter", "")
            if not existing:
                rec["twitter"] = tw
                rec.setdefault("_sources", {})["twitter"] = "presale_list"
                new_twitter += 1
                print(f"  + twitter: @{tw}  ({wallet[:12]}…)")
            elif existing.lower() == tw.lower():
                # Confirmed by presale data — tag source even if handle was already known
                rec.setdefault("_sources", {})["twitter"] = "presale_list"
                already_had += 1
            else:
                # Mismatch — keep existing, log but don't overwrite
                already_had += 1
                print(f"  ! handle mismatch: existing=@{existing} presale=@{tw}  ({wallet[:12]}…)")

        rec["updated_at"] = ts
        identity[wallet] = rec
        tagged += 1

    save_identity(identity)

    print(f"\n✓ Done")
    print(f"  Wallets tagged as presale:  {tagged}")
    print(f"  New Twitter handles added:  {new_twitter}")
    print(f"  Already had Twitter:        {already_had}")
    print(f"\nSaved → {IDENTITY_FILE}")


if __name__ == "__main__":
    main()
