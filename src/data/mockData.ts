// ============================================================
// Mock Data — mirrors M365 Developer Program sample tenant
// 25 users with E5 licenses, Teams Calling, AVD, Hardware
// ============================================================

export type UserStatus = "active" | "offboarding" | "offboarded";
export type HardwareStatus = "assigned" | "pending_return" | "returned";

export interface License {
  skuId: string;
  skuPartNumber: string;
  displayName: string;
  assignedDateTime: string;
}

export interface TeamsConfig {
  teamsEnabled: boolean;
  enterpriseVoiceEnabled: boolean;
  lineUri: string | null;
  phoneNumber: string | null;
  voiceRoutingPolicy: string | null;
  callingPolicy: string | null;
  dialPlan: string | null;
  voicemailEnabled: boolean;
  callForwardingTarget: string | null;
}

export interface HardwareItem {
  id: string;
  type: string;
  make: string;
  model: string;
  serialNumber: string;
  assetTag: string;
  location: string;
  assignedDate: string;
  status: HardwareStatus;
  returnTicket: string | null;
}

export interface AVDAssignment {
  hostPoolId: string;
  hostPoolName: string;
  applicationGroupId: string;
  applicationGroupName: string;
  workspace: string;
  assignedDate: string;
  activeSessions: number;
  sessionStatus: "active" | "disconnected" | "removed";
}

export interface PrinterAssignment {
  printerId: string;
  printerName: string;
  location: string;
  securityGroup: string;
  assignedDate: string;
  removed: boolean;
}

export interface Group {
  id: string;
  displayName: string;
  type: "Security" | "Microsoft365" | "Distribution";
  removed: boolean;
}

export interface Role {
  id: string;
  displayName: string;
  scope: string;
  removed: boolean;
}

export interface MailboxSettings {
  enabled: boolean;
  isShared: boolean;
  autoReplyEnabled: boolean;
  autoReplyMessage: string;
  sendOnBehalfOf: string | null;
  fullAccessDelegates: string[];
  sendDisabled: boolean;
}

export interface MockUser {
  id: string;
  displayName: string;
  userPrincipalName: string;
  mail: string;
  jobTitle: string;
  department: string;
  officeLocation: string;
  mobilePhone: string;
  businessPhones: string[];
  accountEnabled: boolean;
  createdDateTime: string;
  managerId: string;
  managerName: string;
  status: UserStatus;
  licenses: License[];
  teamsConfig: TeamsConfig;
  hardware: HardwareItem[];
  avdAssignments: AVDAssignment[];
  printerAssignments: PrinterAssignment[];
  groupMemberships: Group[];
  roleAssignments: Role[];
  mailboxSettings: MailboxSettings;
  sessionsRevoked: boolean;
  passwordReset: boolean;
  offboardingStarted: string | null;
  offboardingCompleted: string | null;
}

// ---- License catalog ----
export const LICENSE_CATALOG: Record<string, { skuId: string; skuPartNumber: string; displayName: string }> = {
  E5: {
    skuId: "c7df2760-2c81-4ef7-b578-5b5392b571df",
    skuPartNumber: "ENTERPRISEPREMIUM",
    displayName: "Microsoft 365 E5",
  },
  TEAMS_CALLING: {
    skuId: "4d4cde80-2b28-4825-a7a2-eada3975e9da",
    skuPartNumber: "MCOEV",
    displayName: "Microsoft Teams Phone Standard",
  },
  AUDIO_CONF: {
    skuId: "295a8eb0-f78d-45c7-8b5b-1eed5ed02dff",
    skuPartNumber: "MCOMEETADV",
    displayName: "Microsoft 365 Audio Conferencing",
  },
  INTUNE: {
    skuId: "efccb6f7-5641-4e0e-bd10-b4976e1bf68e",
    skuPartNumber: "EMS",
    displayName: "Microsoft Intune",
  },
};

// ---- Shared infrastructure catalog ----
export const AVD_HOST_POOLS = [
  { id: "hp-001", name: "Finance-Pool-WVD", workspace: "Finance Workspace", appGroup: "ag-fin-001", appGroupName: "Finance Apps" },
  { id: "hp-002", name: "Sales-Pool-WVD", workspace: "Sales Workspace", appGroup: "ag-sales-001", appGroupName: "Sales Apps" },
  { id: "hp-003", name: "IT-Pool-WVD", workspace: "IT Admin Workspace", appGroup: "ag-it-001", appGroupName: "IT Admin Apps" },
  { id: "hp-004", name: "HR-Pool-WVD", workspace: "HR Workspace", appGroup: "ag-hr-001", appGroupName: "HR Apps" },
];

export const PRINTER_CATALOG = [
  { id: "prn-001", name: "PRN-SEA-FL3-HP", location: "Seattle Floor 3", group: "GRP-PRN-SEA-FL3" },
  { id: "prn-002", name: "PRN-SEA-FL5-KM", location: "Seattle Floor 5", group: "GRP-PRN-SEA-FL5" },
  { id: "prn-003", name: "PRN-NYC-FL2-XEROX", location: "New York Floor 2", group: "GRP-PRN-NYC-FL2" },
  { id: "prn-004", name: "PRN-CHI-FL1-RICOH", location: "Chicago Floor 1", group: "GRP-PRN-CHI-FL1" },
];

function makeUser(
  id: string,
  firstName: string,
  lastName: string,
  jobTitle: string,
  department: string,
  location: string,
  ext: string,
  managerId: string,
  managerName: string,
  hostPoolIndex: number,
  printerIndexes: number[],
  extraGroups: string[],
  roles: { displayName: string; scope: string }[]
): MockUser {
  const upn = `${firstName}${lastName[0]}@M365x12345.onmicrosoft.com`;
  const areaCode = location === "Seattle" ? "425" : location === "New York" ? "212" : "312";
  const phoneNumber = `+1 ${areaCode} 555 0${ext}`;
  const hp = AVD_HOST_POOLS[hostPoolIndex];

  return {
    id,
    displayName: `${firstName} ${lastName}`,
    userPrincipalName: upn,
    mail: upn,
    jobTitle,
    department,
    officeLocation: location,
    mobilePhone: phoneNumber,
    businessPhones: [phoneNumber],
    accountEnabled: true,
    createdDateTime: "2023-01-15T08:00:00Z",
    managerId,
    managerName,
    status: "active",
    sessionsRevoked: false,
    passwordReset: false,
    offboardingStarted: null,
    offboardingCompleted: null,

    licenses: [
      { skuId: LICENSE_CATALOG.E5.skuId, skuPartNumber: LICENSE_CATALOG.E5.skuPartNumber, displayName: LICENSE_CATALOG.E5.displayName, assignedDateTime: "2023-01-15T08:00:00Z" },
      { skuId: LICENSE_CATALOG.TEAMS_CALLING.skuId, skuPartNumber: LICENSE_CATALOG.TEAMS_CALLING.skuPartNumber, displayName: LICENSE_CATALOG.TEAMS_CALLING.displayName, assignedDateTime: "2023-01-15T08:00:00Z" },
      { skuId: LICENSE_CATALOG.AUDIO_CONF.skuId, skuPartNumber: LICENSE_CATALOG.AUDIO_CONF.skuPartNumber, displayName: LICENSE_CATALOG.AUDIO_CONF.displayName, assignedDateTime: "2023-01-15T08:00:00Z" },
    ],

    teamsConfig: {
      teamsEnabled: true,
      enterpriseVoiceEnabled: true,
      lineUri: `tel:${phoneNumber.replace(/ /g, "")}`,
      phoneNumber,
      voiceRoutingPolicy: "US-Domestic-International",
      callingPolicy: "AllowCalling",
      dialPlan: "US-DialPlan",
      voicemailEnabled: true,
      callForwardingTarget: null,
    },

    hardware: [
      {
        id: `hw-${id}-001`,
        type: "Laptop",
        make: "Dell",
        model: "Latitude 5540",
        serialNumber: `SN${id.replace("usr-", "")}LAPTOP`,
        assetTag: `AT-${id.replace("usr-", "")}-LT`,
        location,
        assignedDate: "2023-01-15",
        status: "assigned",
        returnTicket: null,
      },
      {
        id: `hw-${id}-002`,
        type: "Mobile Phone",
        make: "Apple",
        model: "iPhone 15 Pro",
        serialNumber: `SN${id.replace("usr-", "")}PHONE`,
        assetTag: `AT-${id.replace("usr-", "")}-PH`,
        location,
        assignedDate: "2023-01-15",
        status: "assigned",
        returnTicket: null,
      },
    ],

    avdAssignments: [
      {
        hostPoolId: hp.id,
        hostPoolName: hp.name,
        applicationGroupId: hp.appGroup,
        applicationGroupName: hp.appGroupName,
        workspace: hp.workspace,
        assignedDate: "2023-01-20",
        activeSessions: Math.floor(Math.random() * 2),
        sessionStatus: "active",
      },
    ],

    printerAssignments: printerIndexes.map((i) => ({
      printerId: PRINTER_CATALOG[i].id,
      printerName: PRINTER_CATALOG[i].name,
      location: PRINTER_CATALOG[i].location,
      securityGroup: PRINTER_CATALOG[i].group,
      assignedDate: "2023-01-20",
      removed: false,
    })),

    groupMemberships: [
      { id: `grp-all-employees`, displayName: "All Employees", type: "Security", removed: false },
      { id: `grp-dept-${department.toLowerCase().replace(/ /g, "-")}`, displayName: `Dept - ${department}`, type: "Security", removed: false },
      { id: `grp-m365-${department.toLowerCase().replace(/ /g, "-")}`, displayName: `M365 - ${department} Team`, type: "Microsoft365", removed: false },
      ...extraGroups.map((g, idx) => ({ id: `grp-extra-${id}-${idx}`, displayName: g, type: "Security" as const, removed: false })),
    ],

    roleAssignments: roles.map((r, idx) => ({
      id: `role-${id}-${idx}`,
      displayName: r.displayName,
      scope: r.scope,
      removed: false,
    })),

    mailboxSettings: {
      enabled: true,
      isShared: false,
      autoReplyEnabled: false,
      autoReplyMessage: "",
      sendOnBehalfOf: null,
      fullAccessDelegates: [],
      sendDisabled: false,
    },
  };
}

// ---- 25 M365 Sample Users ----
export const MOCK_USERS: MockUser[] = [
  makeUser("usr-001", "Adele",    "Vance",     "Retail Manager",           "Sales & Marketing",  "Seattle",  "101", "usr-020", "Patti Fernandez",  1, [0, 1], ["GRP-VPN-Users", "GRP-File-Share-Sales"],     []),
  makeUser("usr-002", "Alex",     "Wilber",    "Marketing Assistant",       "Sales & Marketing",  "Seattle",  "102", "usr-001", "Adele Vance",      1, [0],    ["GRP-VPN-Users"],                              []),
  makeUser("usr-003", "Allan",    "Deyoung",   "IT Admin",                  "IT",                 "Seattle",  "103", "usr-019", "Nestor Wilke",     2, [0, 1], ["GRP-IT-Admins", "GRP-VPN-Users"],             [{ displayName: "Teams Administrator", scope: "/subscriptions/tenant" }]),
  makeUser("usr-004", "Bianca",   "Pisani",    "Global Retail Manager",     "Operations",         "Seattle",  "104", "usr-020", "Patti Fernandez",  0, [0],    ["GRP-VPN-Users", "GRP-Operations"],            []),
  makeUser("usr-005", "Brian",    "Johnson",   "Auditor",                   "Finance",            "New York", "105", "usr-022", "Miriam Graham",    0, [2],    ["GRP-Finance-ReadOnly", "GRP-VPN-Users"],      []),
  makeUser("usr-006", "Cameron",  "White",     "Business Development Mgr",  "Sales & Marketing",  "Seattle",  "106", "usr-001", "Adele Vance",      1, [0, 1], ["GRP-VPN-Users", "GRP-Sales-Leadership"],     []),
  makeUser("usr-007", "Christie", "Cline",     "Product Catalog Manager",   "Operations",         "Seattle",  "107", "usr-020", "Patti Fernandez",  0, [1],    ["GRP-VPN-Users"],                              []),
  makeUser("usr-008", "Debra",    "Berger",    "Support Engineer",          "IT",                 "Chicago",  "108", "usr-003", "Allan Deyoung",    2, [3],    ["GRP-IT-Support", "GRP-VPN-Users"],            []),
  makeUser("usr-009", "Emily",    "Braun",     "Data Analytics Engineer",   "IT",                 "Seattle",  "109", "usr-003", "Allan Deyoung",    2, [0],    ["GRP-IT-Dev", "GRP-VPN-Users"],                [{ displayName: "Contributor", scope: "/subscriptions/azure-sub-prod" }]),
  makeUser("usr-010", "Garth",    "Fort",      "Shipping Manager",          "Operations",         "Chicago",  "110", "usr-004", "Bianca Pisani",    0, [3],    ["GRP-VPN-Users", "GRP-Warehouse"],             []),
  makeUser("usr-011", "Grady",    "Archie",    "Designer",                  "Creative",           "Seattle",  "111", "usr-006", "Cameron White",    1, [0],    ["GRP-VPN-Users", "GRP-Creative-Assets"],       []),
  makeUser("usr-012", "Henrietta","Mueller",   "Controller",                "Finance",            "New York", "112", "usr-022", "Miriam Graham",    0, [2],    ["GRP-Finance-ReadOnly", "GRP-Finance-Write"],  []),
  makeUser("usr-013", "Irvin",    "Sayers",    "Executive Assistant",       "Executive",          "Seattle",  "113", "usr-020", "Patti Fernandez",  1, [0, 1], ["GRP-VPN-Users", "GRP-Exec-Support"],          []),
  makeUser("usr-014", "Isaiah",   "Langer",    "Systems Engineer",          "IT",                 "Seattle",  "114", "usr-003", "Allan Deyoung",    2, [0, 1], ["GRP-IT-Admins", "GRP-VPN-Users"],             [{ displayName: "Global Admin", scope: "/subscriptions/tenant" }, { displayName: "Exchange Admin", scope: "/subscriptions/tenant" }]),
  makeUser("usr-015", "Johanna",  "Lorenz",    "Business Administrator",    "Operations",         "Chicago",  "115", "usr-004", "Bianca Pisani",    0, [3],    ["GRP-VPN-Users"],                              []),
  makeUser("usr-016", "Joni",     "Sherman",   "Paralegal",                 "Legal",              "New York", "116", "usr-020", "Patti Fernandez",  0, [2],    ["GRP-Legal", "GRP-VPN-Users"],                 []),
  makeUser("usr-017", "Lee",      "Gu",        "Staff Accountant",          "Finance",            "Seattle",  "117", "usr-022", "Miriam Graham",    0, [0],    ["GRP-Finance-ReadOnly", "GRP-VPN-Users"],      []),
  makeUser("usr-018", "Lidia",    "Holloway",  "Project Manager",           "IT",                 "Seattle",  "118", "usr-003", "Allan Deyoung",    2, [0, 1], ["GRP-PMO", "GRP-VPN-Users"],                   []),
  makeUser("usr-019", "Nestor",   "Wilke",     "IT Director",               "IT",                 "Seattle",  "119", "usr-020", "Patti Fernandez",  2, [0, 1], ["GRP-IT-Admins", "GRP-VPN-Users"],             [{ displayName: "Global Admin", scope: "/subscriptions/tenant" }]),
  makeUser("usr-020", "Patti",    "Fernandez", "Chief Executive Officer",   "Executive",          "Seattle",  "120", "usr-020", "Patti Fernandez",  1, [0, 1], ["GRP-Exec", "GRP-VPN-Users"],                  [{ displayName: "Global Admin", scope: "/subscriptions/tenant" }]),
  makeUser("usr-021", "Lynne",    "Robbins",   "HR Specialist",             "Human Resources",    "Seattle",  "121", "usr-020", "Patti Fernandez",  3, [0],    ["GRP-HR", "GRP-VPN-Users"],                    []),
  makeUser("usr-022", "Miriam",   "Graham",    "CFO",                       "Finance",            "New York", "122", "usr-020", "Patti Fernandez",  0, [2],    ["GRP-Finance-Leadership", "GRP-VPN-Users"],    [{ displayName: "Billing Administrator", scope: "/subscriptions/tenant" }]),
  makeUser("usr-023", "Megan",    "Bowen",     "Marketing Manager",         "Sales & Marketing",  "Seattle",  "123", "usr-001", "Adele Vance",      1, [0, 1], ["GRP-VPN-Users", "GRP-Marketing"],             []),
  makeUser("usr-024", "Pradeep",  "Gupta",     "Accountant",                "Finance",            "Chicago",  "124", "usr-022", "Miriam Graham",    0, [3],    ["GRP-Finance-ReadOnly", "GRP-VPN-Users"],      []),
  makeUser("usr-025", "Meredith", "Langston",  "Helpdesk Technician",       "IT",                 "Chicago",  "125", "usr-003", "Allan Deyoung",    2, [3],    ["GRP-IT-Support", "GRP-VPN-Users"],            []),
];
