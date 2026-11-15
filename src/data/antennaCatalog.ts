import { AntennaType, BilingualText, FrequencyPreset } from '../types/antenna';

export interface AntennaCatalogEntry {
  type: AntennaType;
  name: BilingualText;
  shortName: BilingualText;
  badge: string;
  category: BilingualText;
  typicalGainRange: string;
  summary: BilingualText;
  howItWorks: BilingualText;
  applications: BilingualText[];
  pros: BilingualText[];
  cons: BilingualText[];
}

export const FREQUENCY_PRESETS: FrequencyPreset[] = [
  {
    id: 'fm-broadcast',
    label: '98.0 MHz',
    freqMHz: 98,
    band: 'VHF FM',
    usage: {
      id: 'Siaran Radio FM Komersial (88–108 MHz)',
      en: 'Commercial FM Radio Broadcast (88–108 MHz)',
    },
  },
  {
    id: 'vhf-ham',
    label: '144.3 MHz',
    freqMHz: 144.3,
    band: '2m VHF',
    usage: {
      id: 'Radio Amatir ORARI/RAPI 2-Meter & Satelit NOAA',
      en: '2-Meter Amateur Radio & Weather Satellite',
    },
  },
  {
    id: 'lora-433',
    label: '433.9 MHz',
    freqMHz: 433.92,
    band: '70cm ISM',
    usage: {
      id: 'Telemetri Drone, LoRa 433, UHF Amateur',
      en: 'Drone Telemetry, LoRa 433, 70cm Amateur Band',
    },
  },
  {
    id: 'meshtastic-915',
    label: '915.0 MHz',
    freqMHz: 915,
    band: 'UHF ISM',
    usage: {
      id: 'Meshtastic LoRa, RFID, ExpressLRS 900',
      en: 'Meshtastic LoRa Mesh, RFID, ExpressLRS 900',
    },
  },
  {
    id: 'adsb-1090',
    label: '1090 MHz',
    freqMHz: 1090,
    band: 'L-Band',
    usage: {
      id: 'Radar Transponder Pesawat ADS-B (FlightRadar)',
      en: 'Aircraft ADS-B Transponder Tracking',
    },
  },
  {
    id: 'lband-sat',
    label: '1575.4 MHz',
    freqMHz: 1575.42,
    band: 'GNSS L1',
    usage: {
      id: 'Navigasi Satelit GPS L1 / Inmarsat / HRPT',
      en: 'GPS L1 Navigation / Weather Satellites',
    },
  },
  {
    id: 'wifi-24',
    label: '2450 MHz',
    freqMHz: 2450,
    band: '2.4 GHz S-Band',
    usage: {
      id: 'Wi-Fi 2.4 GHz, Bluetooth, ELRS RC Control',
      en: 'Wi-Fi 2.4 GHz, Bluetooth, ELRS RC Link',
    },
  },
  {
    id: 'fpv-58',
    label: '5800 MHz',
    freqMHz: 5800,
    band: '5.8 GHz C-Band',
    usage: {
      id: 'Video Transmisi FPV Drone & Wi-Fi 5 GHz',
      en: 'FPV Drone Video Link & 5 GHz Wireless Backhaul',
    },
  },
];

export const ANTENNA_CATALOG: Record<AntennaType, AntennaCatalogEntry> = {
  dipole: {
    type: 'dipole',
    name: {
      id: 'Dipole Setengah Gelombang (λ/2)',
      en: 'Half-Wave Dipole (λ/2)',
    },
    shortName: { id: 'Dipole λ/2', en: 'λ/2 Dipole' },
    badge: '2.15 dBi',
    category: { id: 'Omnidirectional / Referensi', en: 'Omnidirectional / Reference' },
    typicalGainRange: '2.15 dBi (0 dBd)',
    summary: {
      id: 'Antena fundamental paling seimbang dengan dua lengan konduktor simetris sepanjang ±0.475λ yang dicatu di titik tengah (center-fed).',
      en: 'The fundamental balanced reference antenna consisting of two symmetrical conductive arms (~0.475λ total) fed at the center.',
    },
    howItWorks: {
      id: 'Arus bolak-balik RF menghasilkan gelombang berdiri (standing wave) dengan arus maksimum di titik tengah (feedpoint) dan tegangan maksimum di kedua ujung lengan. Pola radiasinya berbentuk donat (toroidal) tegak lurus terhadap sumbu kawat.',
      en: 'Alternating RF current establishes a standing wave with maximum current at the center feedpoint and voltage peaks at the tips. It radiates a toroidal (doughnut-shaped) pattern broadside to the wire axis.',
    },
    applications: [
      { id: 'Komunikasi HF/VHF/UHF serbaguna', en: 'General-purpose HF/VHF/UHF communications' },
      { id: 'Elemen utama (Driven Element) pada antena Yagi', en: 'Driven element inside Yagi-Uda arrays' },
      { id: 'Antena referensi pengukuran laboratorium RF', en: 'Standard reference antenna in RF calibration labs' },
    ],
    pros: [
      { id: 'Konstruksi sangat sederhana dan mudah dikalibrasi', en: 'Simple construction and predictable tuning' },
      { id: 'Impedansi alami ~73 Ω dekat dengan kabel koaksial 50/75 Ω', en: 'Natural ~73 Ω impedance close to 50/75 Ω coax' },
    ],
    cons: [
      { id: 'Gain rendah dibanding antena pengarah', en: 'Low gain compared to directional arrays' },
      { id: 'Membutuhkan Balun 1:1 untuk mencegah arus balik di selubung koaksial', en: 'Requires 1:1 Balun to stop common-mode coax currents' },
    ],
  },

  groundplane: {
    type: 'groundplane',
    name: {
      id: 'Monopole λ/4 Ground Plane',
      en: 'Quarter-Wave Ground Plane (λ/4)',
    },
    shortName: { id: 'Ground Plane λ/4', en: 'λ/4 Monopole' },
    badge: '3.2–5.1 dBi',
    category: { id: 'Omnidirectional Vertikal', en: 'Vertical Omnidirectional' },
    typicalGainRange: '3.2 – 5.15 dBi',
    summary: {
      id: 'Antena vertikal seperempat gelombang (λ/4) dengan 4 radial penyeimbang di bagian dasar yang bertindak sebagai cermin bidang tanah buatan.',
      en: 'Vertical quarter-wave (λ/4) radiator over four drooping radials that synthesize an artificial electromagnetic mirror ground plane.',
    },
    howItWorks: {
      id: 'Elemen vertikal atas memancarkan setengah gelombang, sedangkan 4 radial bawah membentuk bayangan cermin elektromagnetik. Menekuk radial sebesar 45° ke bawah menaikkan impedansi dasar dari ~36 Ω menjadi tepat 50 Ω sehingga cocok langsung dengan koaksial.',
      en: 'The vertical whip forms one half of a dipole while the four radials create a virtual image plane. Drooping the radials down at 45° raises feed impedance from ~36 Ω to a direct 50 Ω coax match.',
    },
    applications: [
      { id: 'Penerima sinyal pesawat ADS-B 1090 MHz', en: '1090 MHz ADS-B aircraft receiver base stations' },
      { id: 'Base station Repeater VHF/UHF & Gateway LoRa', en: 'VHF/UHF Repeater base stations & LoRa Gateways' },
      { id: 'Telemetri stasiun darat (Ground Control Station)', en: 'Ground Control Station telemetry links' },
    ],
    pros: [
      { id: 'Pancaran 360° merata ke segala arah horizontal', en: 'Uniform 360° horizontal omnidirectional coverage' },
      { id: 'Langsung matching 50 Ω tanpa komponen matching rumit', en: 'Direct 50 Ω impedance match by adjusting radial droop angle' },
    ],
    cons: [
      { id: 'Zona mati (null) tepat di atas ujung antena (zenith)', en: 'Radiation null directly overhead at zenith' },
    ],
  },

  jpole: {
    type: 'jpole',
    name: {
      id: 'J-Pole Antenna (λ/2 End-Fed + λ/4 Stub)',
      en: 'J-Pole Antenna (λ/2 End-Fed + λ/4 Stub)',
    },
    shortName: { id: 'J-Pole λ/2', en: 'J-Pole λ/2' },
    badge: '2.8 dBi',
    category: { id: 'Omnidirectional End-Fed', en: 'Omnidirectional End-Fed' },
    typicalGainRange: '2.5 – 3.2 dBi',
    summary: {
      id: 'Antena vertikal berbentuk huruf "J" tanpa radial yang mencatu elemen λ/2 dari ujung bawah menggunakan saluran transmisi paralel λ/4 (J-Stub) untuk penyesuaian impedansi tepat 50 Ω.',
      en: 'Radials-free vertical J-shaped antenna that end-feeds a λ/2 radiator via a parallel λ/4 matching stub section to achieve an exact 50 Ω coaxial match.',
    },
    howItWorks: {
      id: 'Ujung bawah radiator setengah gelombang (λ/2) memiliki impedansi sangat tinggi (~2500 Ω), sedangkan bagian dasar stub hubungan pendek (shorting bar) memiliki impedansi 0 Ω. Dengan menggeser titik tap koaksial sekitar ~0.034λ di atas dasar stub λ/4, diperoleh titik impedansi presisi 50 Ω tanpa memerlukan elemen radial.',
      en: 'The bottom end of a half-wave (λ/2) radiator exhibits high impedance (~2500 Ω), while the shorted bottom of the λ/4 stub is 0 Ω. Sliding the feed tap ~0.034λ above the shorting bar locates the exact 50 Ω point with zero ground radials required.',
    },
    applications: [
      { id: 'Base station VHF/UHF Radio Amatir (2m / 70cm) & Repeater darurat', en: 'VHF/UHF Amateur Radio base stations (2m / 70cm) & emergency repeaters' },
      { id: 'Gateway LoRa / Meshtastic & APRS dari pipa tembaga utuh', en: 'Copper-pipe LoRa / Meshtastic gateways & APRS digipeaters' },
    ],
    pros: [
      { id: 'Tanpa elemen radial bawah sehingga sangat ringkas dipasang di tiang/balkon', en: 'No ground plane radials required — slim vertical profile for masts or balconies' },
      { id: 'Bagian bawah dapat langsung dibaut dan di-ground-kan ke tiang logam sebagai penangkal petir DC', en: 'Bottom shorting bar is at DC ground and bolts directly to metallic masts for lightning protection' },
    ],
    cons: [
      { id: 'Wajib diberi Choke Balun (RF Ferrite / Coax Coil) pada titik tap untuk mencegah arus liar di kulit koaksial', en: 'Requires an RF Choke Balun at the feed tap to prevent common-mode currents on the coax shield' },
    ],
  },

  fiberglass: {
    type: 'fiberglass',
    name: {
      id: 'Fiberglass Omni Collinear Array (Base Station)',
      en: 'Fiberglass Omni Collinear Array (Base Station)',
    },
    shortName: { id: 'Fiberglass Omni', en: 'Fiberglass Omni' },
    badge: '6–12 dBi',
    category: { id: 'Phased Collinear Array', en: 'Phased Collinear Array' },
    typicalGainRange: '5.5 – 12.0 dBi',
    summary: {
      id: 'Antena stasiun induk luar ruang berselubung tabung Fiberglass tahan cuaca yang berisi susunan bertingkat elemen λ/2 dengan kumparan pembalik fase (Phasing Coil λ/4) untuk pancaran 360° jarak jauh.',
      en: 'Weatherproof Fiberglass Radome base antenna housing vertically stacked λ/2 collinear radiator sections separated by λ/4 phasing coils for high-gain 360° horizon coverage.',
    },
    howItWorks: {
      id: 'Di dalam selongsong pipa Fiberglass (FRP), beberapa elemen dipol vertikal λ/2 disusun segaris (collinear) ke atas. Karena arus bolak-balik akan berbalik fase setiap setengah gelombang, dipasang kumparan pembalik fase (λ/4 Phasing Stub/Coil) di setiap sambungan agar seluruh elemen memancar sefase dan memipihkan kubah sinyal ke arah cakrawala.',
      en: 'Inside the protective FRP fiberglass tube, multiple vertical λ/2 brass/copper radiators are stacked end-to-end. Helical λ/4 phasing coils between sections invert the alternating phase so all sections radiate in phase, compressing the vertical beam toward the horizon.',
    },
    applications: [
      { id: 'Gateway Utama LoRaWAN / Helium / Meshtastic 433, 868, & 915 MHz', en: 'Primary outdoor LoRaWAN / Helium / Meshtastic 433, 868, & 915 MHz gateways' },
      { id: 'Penerima Radar Pesawat ADS-B 1090 MHz & AIS Kapal Laut', en: '1090 MHz ADS-B aircraft tracking & Marine VHF AIS base stations' },
      { id: 'Base Station Repeater Komersial & Wi-Fi Outdoor Omni', en: 'Commercial Repeater Base Stations & Outdoor Omni Wi-Fi Access Points' },
    ],
    pros: [
      { id: 'Gain omnidirectional 360° paling tinggi dengan ketahanan cuaca ekstrem (UV & hujan)', en: 'Highest 360° omnidirectional gain with rugged weatherproof fiberglass protection' },
      { id: 'Semakin banyak seksi collinear di dalamnya, jangkauan horizontal semakin jauh', en: 'Stacking more internal collinear sections directly boosts horizontal link range' },
    ],
    cons: [
      { id: 'Pada jumlah seksi tinggi (>8 seksi), berkas vertikal sangat tipis sehingga tidak cocok untuk posisi di puncak bukit curam', en: 'Very high section counts (>8) create a razor-thin vertical beam that can overshoot nearby valleys' },
    ],
  },

  yagi: {
    type: 'yagi',
    name: {
      id: 'Yagi-Uda Directional Boom Array',
      en: 'Yagi-Uda Directional Boom Array',
    },
    shortName: { id: 'Yagi-Uda Array', en: 'Yagi-Uda' },
    badge: '8–16 dBi',
    category: { id: 'Directional Boom Array', en: 'Directional Boom Array' },
    typicalGainRange: '7.5 – 16.5 dBi',
    summary: {
      id: 'Antena pengarah legendaris dengan elemen Driven aktif, 1 Reflector di belakang, dan deretan Director parasitik di sepanjang boom untuk memfokuskan "boom sinyal" ke depan.',
      en: 'Iconic parasitic array using 1 Reflector, 1 Driven element, and multiple Directors along a boom to focus RF energy into a high-gain forward beam.',
    },
    howItWorks: {
      id: 'Hanya Driven Element yang terhubung ke kabel RF. Elemen Reflector (+5% lebih panjang) menginduksi arus berlawanan fase yang memantulkan gelombang ke depan, sementara deretan Director (-5% lebih pendek) bertindak sebagai lensa gelombang berjalan yang memfokuskan energi sepanjang boom.',
      en: 'Only the Driven Element is connected to the feedline. The slightly longer Reflector reflects back-wave phase forward, while progressively shorter Directors act as a traveling-wave lens that compresses energy along the boom axis.',
    },
    applications: [
      { id: 'Komunikasi jarak jauh Point-to-Point & DX Radio Amatir', en: 'Long-range Point-to-Point links & Amateur DXing' },
      { id: 'Pelacakan satelit amatir & telemetri roket/UAV', en: 'Satellite tracking & long-range UAV telemetry' },
      { id: 'Penerima TV Digital UHF & penguat sinyal seluler daerah terpencil', en: 'UHF Digital TV & rural cellular signal boosters' },
    ],
    pros: [
      { id: 'Gain tinggi dan rasio Front-to-Back sangat baik untuk menolak interferensi', en: 'High forward gain and strong Front-to-Back interference rejection' },
      { id: 'Gain dapat ditingkatkan langsung dengan memperpanjang boom & menambah Director', en: 'Scalable gain by extending boom length and adding directors' },
    ],
    cons: [
      { id: 'Lebar pita (bandwidth) menyempit saat gain ditingkatkan', en: 'Narrower VSWR bandwidth when optimized for maximum gain' },
      { id: 'Ukuran boom cukup panjang pada frekuensi VHF', en: 'Physically long boom on lower VHF frequencies' },
    ],
  },

  dish: {
    type: 'dish',
    name: {
      id: 'Parabolic Dish Reflector',
      en: 'Parabolic Dish Reflector',
    },
    shortName: { id: 'Parabolic Dish', en: 'Parabolic Dish' },
    badge: '18–38 dBi',
    category: { id: 'High-Gain Aperture', en: 'High-Gain Aperture' },
    typicalGainRange: '18.0 – 40.0+ dBi',
    summary: {
      id: 'Antena reflektor cekung paraboloid presisi tinggi yang memantulkan gelombang dari titik fokus (Prime Focus Feed Horn) menjadi berkas sinyal lurus setajam sinar laser (Pencil Beam).',
      en: 'High-gain paraboloid reflector dish that collimates spherical waves from a prime-focus feed horn into a tightly focused pencil beam.',
    },
    howItWorks: {
      id: 'Geometri parabola menjamin bahwa jarak tempuh gelombang dari titik fokus (f) ke permukaan piringan lalu keluar ke bidang datar depan selalu memiliki fase yang sama persis. Semakin besar rasio diameter terhadap panjang gelombang (D/λ), semakin tajam dan kuat sorotan sinyalnya.',
      en: 'Parabolic geometry ensures equal path length from the focal point (f) to the aperture plane, aligning all reflected waves in phase. Gain scales quadratically with diameter-to-wavelength ratio (D/λ).',
    },
    applications: [
      { id: 'Stasiun bumi satelit (VSAT, Weather Sat HRPT, Deep Space)', en: 'Satellite Earth stations (VSAT, HRPT, Deep Space)' },
      { id: 'Backhaul gelombang mikro (Microwave Link) antar menara', en: 'Long-haul point-to-point microwave backhaul' },
      { id: 'Radio Astronomi & Radar Cuaca Doppler', en: 'Radio astronomy & Doppler weather radar' },
    ],
    pros: [
      { id: 'Gain tertinggi dibanding semua jenis antena lain pada frekuensi GHz', en: 'Highest achievable gain and narrowest beamwidth at GHz frequencies' },
      { id: 'Feed horn dapat diganti untuk mengubah frekuensi atau polarisasi', en: 'Feed horn can be swapped for multi-band or dual-polarization' },
    ],
    cons: [
      { id: 'Menuntut pengarahan sudut (pointing accuracy) sangat presisi (< 2°)', en: 'Requires extremely precise mechanical aiming (< 2°)' },
      { id: 'Tidak praktis jika diameter D kurang dari 2λ', en: 'Ineffective if dish diameter D is smaller than 2λ' },
    ],
  },

  helical: {
    type: 'helical',
    name: {
      id: 'Axial-Mode Helical Antenna',
      en: 'Axial-Mode Helical Antenna',
    },
    shortName: { id: 'Helical Spiral', en: 'Helical' },
    badge: '10–17 dBi',
    category: { id: 'Circular Polarization Boom', en: 'Circular Polarization Boom' },
    typicalGainRange: '10.0 – 17.5 dBi',
    summary: {
      id: 'Antena kawat spiral tiga dimensi di atas pelat reflektor yang memancarkan gelombang terpolarisasi melingkar (RHCP/LHCP) sepanjang sumbu heliks.',
      en: 'Three-dimensional coiled conductor over a ground reflector producing high-gain circularly polarized (RHCP/LHCP) waves along the helix axis.',
    },
    howItWorks: {
      id: 'Ketika keliling satu lilitan (C) mendekati 1 panjang gelombang (λ) dan jarak antar-lilitan (S) sekitar 0.25λ, antena beroperasi dalam Axial Mode (End-Fire). Medan listrik berputar seperti sekrup saat merambat maju, menghilangkan masalah rotasi orientasi antena (Faraday rotation & multipath rejection).',
      en: 'When circumference C ≈ 1λ and turn spacing S ≈ 0.25λ, the helix operates in Axial (End-Fire) mode. The E-field vector rotates corkscrew-style as it propagates, rejecting multipath reflections and orientation mismatch.',
    },
    applications: [
      { id: 'Stasiun darat FPV Drone jarak jauh (5.8 GHz / 2.4 GHz / 1.3 GHz)', en: 'Long-range FPV Drone ground stations (5.8 / 2.4 / 1.3 GHz)' },
      { id: 'Komunikasi Satelit LEO/MEO & Telemetri Antariksa (VHF/UHF/L-Band)', en: 'LEO/MEO Satellite communications & space telemetry' },
      { id: 'Penerima sinyal satelit cuaca Inmarsat / GOES', en: 'Inmarsat / GOES weather satellite reception' },
    ],
    pros: [
      { id: 'Polarisasi melingkar kebal terhadap kemiringan posisi pesawat/satelit', en: 'Circular polarization is immune to aircraft banking or Faraday rotation' },
      { id: 'Bandwidth operasional sangat lebar (C/λ antara 0.75 hingga 1.3)', en: 'Exceptionally wide operational bandwidth' },
    ],
    cons: [
      { id: 'Arah lilitan (RHCP vs LHCP) harus sama dengan antena lawan (jika terbalik rugi -20 dB)', en: 'Must match TX handedness (RHCP vs LHCP mismatch causes >20 dB loss)' },
    ],
  },

  patch: {
    type: 'patch',
    name: {
      id: 'Microstrip Patch Antenna (PCB)',
      en: 'Microstrip Patch Antenna (PCB)',
    },
    shortName: { id: 'Microstrip Patch', en: 'PCB Patch' },
    badge: '6–9 dBi',
    category: { id: 'Planar PCB Directional', en: 'Planar PCB Directional' },
    typicalGainRange: '6.0 – 9.0 dBi',
    summary: {
      id: 'Antena datar profil rendah yang dicetak di atas papan PCB dielektrik (FR-4 / Rogers) dengan bidang ground tembaga penuh di sisi belakang.',
      en: 'Low-profile planar resonant patch etched on a dielectric PCB substrate above a continuous copper ground plane.',
    },
    howItWorks: {
      id: 'Pelat tembaga persegi panjang dengan panjang L ≈ λ_eff/2 membentuk rongga resonansi (cavity resonator) terhadap ground plane. Radiasi terjadi akibat medan rumbai (fringing fields) di kedua tepi ujung patch yang sefase dan menembakkan gelombang ke atas tegak lurus permukaan PCB (broadside).',
      en: 'A rectangular copper patch of length L ≈ λ_eff/2 forms a resonant cavity over the ground plane. Fringing electric fields at the two radiating edges add in-phase to project a hemispherical broadside beam.',
    },
    applications: [
      { id: 'Antena internal Smartphone, Wi-Fi Router, GPS & Kacamata FPV', en: 'Embedded Smartphone, Wi-Fi, GPS, and FPV Goggle antennas' },
      { id: 'Radar Otomotif & Phased Array 5G / Satelit Starlink', en: 'Automotive radar & 5G / Satellite phased-array tiles' },
    ],
    pros: [
      { id: 'Sangat tipis, ringan, dan dapat diproduksi massal dengan pencetakan PCB', en: 'Ultra-thin, lightweight, and easily fabricated via standard PCB etching' },
      { id: 'Cocokใช้ dengan takikan Inset Feed untuk penyesuaian 50 Ω langsung', en: 'Clean 50 Ω matching using calculated inset-feed notch depth' },
    ],
    cons: [
      { id: 'Bandwidth sempit (2–5%) dan sensitif terhadap nilai εr bahan PCB', en: 'Narrow bandwidth (2–5%) and sensitive to substrate εr tolerances' },
    ],
  },

  biquad: {
    type: 'biquad',
    name: {
      id: 'Biquad Double-Loop Reflector',
      en: 'Biquad Double-Loop Reflector',
    },
    shortName: { id: 'Biquad Loop', en: 'Biquad' },
    badge: '10.5–12 dBi',
    category: { id: 'Directional Loop Array', en: 'Directional Loop Array' },
    typicalGainRange: '10.5 – 12.0 dBi',
    summary: {
      id: 'Antena DIY favorit para perakit RF berupa kawat tembaga tunggal yang ditekuk membentuk dua belah ketupat (angka 8) di depan pelat reflektor logam.',
      en: 'High-efficiency DIY favorite formed from a single copper wire bent into two adjoining λ-perimeter diamond loops in front of a flat metallic reflector.',
    },
    howItWorks: {
      id: 'Setiap belah ketupat memiliki keliling 1λ (masing-masing sisi λ/4). Kedua sisi aktif di dekat titik tengah memancarkan fase yang saling menguatkan, sementara pelat reflektor pada jarak ~0.125λ memantulkan pancaran belakang menjadi gain maju sekitar 11 dBi dengan sudut bukaan lebar ~65°.',
      en: 'Each diamond loop has a 1λ perimeter (λ/4 per side). Current alignment across the two loops doubles effective aperture, while the backing reflector at ~0.125λ spacing yields ~11 dBi gain and a wide ~65° beam.',
    },
    applications: [
      { id: 'Penguat sinyal Wi-Fi jarak jauh & titik akses luar ruang', en: 'Long-range Wi-Fi links & outdoor wireless CPEs' },
      { id: 'Feed utama (Illuminator) untuk piringan parabola satelit/Wi-Fi', en: 'High-efficiency prime-focus feed for parabolic dishes' },
      { id: 'Antena penerima video FPV Drone 2.4 / 5.8 GHz', en: '2.4 / 5.8 GHz FPV Drone video receiver antenna' },
    ],
    pros: [
      { id: 'Sangat mudah dibuat sendiri dari kawat tembaga & papan PCB polos', en: 'Easy DIY fabrication from solid copper wire and copper-clad board' },
      { id: 'Bandwidth lebar dan impedansi mendekati 50 Ω', en: 'Generous bandwidth and natural ~50 Ω input impedance' },
    ],
    cons: [
      { id: 'Membutuhkan ketelitian lekukan sudut 90° pada kedelapan sisi kawat', en: 'Requires clean 90° wire bends and uniform standoff spacing' },
    ],
  },

  horn: {
    type: 'horn',
    name: {
      id: 'Pyramidal Horn Antenna (Waveguide)',
      en: 'Pyramidal Horn Antenna (Waveguide)',
    },
    shortName: { id: 'Pyramidal Horn', en: 'Horn Waveguide' },
    badge: '14–22 dBi',
    category: { id: 'Microwave Aperture Waveguide', en: 'Microwave Aperture' },
    typicalGainRange: '14.0 – 22.0 dBi',
    summary: {
      id: 'Antena corong logam berbentuk piramida yang menjembatani pandu gelombang (waveguide) menuju ruang bebas dengan transisi impedansi mulus hingga 377 Ω.',
      en: 'Flared metallic waveguide horn providing a smooth impedance transition from a rectangular waveguide feed to 377 Ω free space.',
    },
    howItWorks: {
      id: 'Sinyal diumpankan melalui probe λ/4 di dalam pandu gelombang persegi (Waveguide Cavity), lalu merambat melalui corong yang melebar di bidang E dan H. Pelebaran bertahap mencegah pantulan balik gelombang dan membentuk pancaran terarah dengan sidelobe rendah.',
      en: 'A λ/4 monopole probe excites the TE10 mode inside the rectangular waveguide throat. The pyramidal flare gradually matches the waveguide impedance to free space (377 Ω), yielding a clean directional beam.',
    },
    applications: [
      { id: 'Standar kalibrasi Gain di ruang uji EMC / Anechoic Chamber', en: 'Standard gain calibration inside EMC Anechoic Chambers' },
      { id: 'Radar kecepatan Doppler, satelit gelombang mikro, dan pencitraan mmWave', en: 'Doppler radar, microwave radiometry, and mmWave testing' },
    ],
    pros: [
      { id: 'Kapasitas daya pancar sangat tinggi dan rugi-rugi (loss) nyaris nol', en: 'Extremely high power handling and near-zero ohmic loss' },
      { id: 'Akurasi gain sangat terukur secara matematis tanpa tuning rumit', en: 'Predictable theoretical gain suitable as a laboratory standard' },
    ],
    cons: [
      { id: 'Berat dan besar jika digunakan pada frekuensi di bawah 800 MHz', en: 'Bulky and heavy for frequencies below 800 MHz' },
    ],
  },
};
