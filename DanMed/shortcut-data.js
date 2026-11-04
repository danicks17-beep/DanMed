// Shared defaults for editable DanMed shortcut lists. OTC shortcuts intentionally remain in features.js.
window.DANMED_DEFAULT_SHORTCUT_LISTS = {
  payerShortcuts: [
        {
            category: "Commercial",
            items: [
                { label: "UHC", search: "United HealthCare of all states" },
                { label: "UMR", search: "UMR formerly Commonwealth Administrators, LLC" },
                { label: "BCBS", search: "Blue Cross Blue Shield of North Carolina" },
                { label: "Aetna", search: "Aetna Health Plans" },
                { label: "Cigna", search: "Cigna", targetIndex: 4},
                { label: "Humana", search: "Humana Health Plan" },
                { label: "Wellcare", search: "Wellcare of NC" },
                { label: "Healthspring", search: "Healthspring" },                

            ]
        },
                {
            category: "Military",
            items: [
                { label: "Tricare East", search: "Tricare East Region" },
                { label: "Tricare Prime", search: "Tricare Prime" },
                { label: "Tricare for Life", search: "Tricare for Life" },
                { label: "VA Community Care", search: "VA Community Care Network VACCN" },
                { label: "CHAMPVA", search: "CHAMPVA" },
            ]
        },
        {
            category: "Medicaid",
            items: [
                { label: "Medicaid", search: "Medicaid of North Carolina" },
                { label: "Healthy Blue", search: "Healthy Blue NC" },
                { label: "UHC Community Plan", search: "United Healthcare Community Plan UHC" },
                { label: "Carolina Complete Health", search: "Carolina Complete Health" },
                { label: "AmeriHealth", search: "AmeriHealth Caritas of NC" },
            ]
        },
        {
            category: "Medicare & Supplements",
            items: [
                { label: "Medicare", search: "Medicare of North Carolina - J11" },
                { label: "UHC AARP Medicare Supplement", search: "AARP Medicare Supplement/Fixed Indemnity by UHC" },
                { label: "Aetna Senior Supplement", search: "Aetna Senior Supplemental Insurance" }
            ]
        }
    ],
  locationShortcuts: [
        { label: "Raleigh", search: "Raleigh, NC (3801)" }
    ],
  taskStaffShortcuts: [
        { label: "Lyndsye Sellars", search: "Sellars, Lyndsye" },       
        { label: "Skylar Pritchett", search: "Pritchett, Skylar" },
        { label: "Paige Barnes", search: "Barnes, Paige" },
        { label: "Paige Kirk", search: "Kirk, Paige" },
        { label: "Jimmy Ngo", search: "Ngo, Jimmy" },
        { label: "Anjali Shah", search: "Shah, Anjali" },
        { label: "Robbie Leonardo", search: "Leonardo, Robert" },
        { label: "Madison Moraja", search: "Moraja, Madison" },
        { label: "Jessica Richardson", search: "Richardson, Jessica" },
        { label: "Joshua Robison", search: "Robison, Joshua" },
        { label: "Grace Patel", search: "Patel, Grace" },
        { label: "Sudhanshu Deshpande", search: "Deshpande, Sudhanshu" },
        { label: "Ashton Andrews", search: "Andrews, Ashton" },
        { label: "Sharon Higgs", search: "Higgs, Sharon" },
        { label: "Meg Risinger", search: "Risinger, Meg" },
        { label: "Sade Dennis", search: "Dennis, Sade" },
        { label: "Shelia Hackley", search: "Hackley, Shelia" },
        { label: "Deon Croom", search: "Croom, Deon" }
    ],
  staffShortcuts: [
        { label: "Lyndsye Sellars", search: "Sellars, Lyndsye" },
        { label: "Skylar Pritchett", search: "Pritchett, Skylar" },
        { label: "Paige Barnes", search: "Barnes, Paige" },
        { label: "Paige Kirk", search: "Kirk, Paige" },
        { label: "Jimmy Ngo", search: "Ngo, Jimmy" },
        { label: "Anjali Shah", search: "Shah, Anjali" },
        { label: "Robbie Leonardo", search: "Leonardo, Robert" },
        { label: "Madison Moraja", search: "Moraja, Madison" },
        { label: "Jessica Richardson", search: "Richardson, Jessica" },
        { label: "Joshua Robison", search: "Robison, Joshua" },
        { label: "Grace Patel", search: "Patel, Grace" },
        { label: "Sudhanshu Deshpande", search: "Deshpande, Sudhanshu" },
        { label: "Ashton Andrews", search: "Andrews, Ashton" },
        { label: "Sharon Higgs", search: "Higgs, Sharon" },
        { label: "Meg Risinger", search: "Risinger, Meg" },
        { label: "Dan Nicks", search: "Nicks, Dan" },
        { label: "Sade Dennis", search: "Dennis, Sade" },
        { label: "Shelia Hackley", search: "Hackley, Shelia" },
        { label: "Deon Croom", search: "Croom, Deon" }
    ],
  providerShortcuts: [
        { label: "Patrick Dougherty", search: "Dougherty, Patrick" },
        { label: "Kirk Woelffer", search: "Woelffer, Kirk" },
        { label: "Douglas Smith", search: "Smith, Douglas" },
        { label: "Jordan Meyers", search: "Meyers, Jordan" },
        { label: "Alan Boehm", search: "Boehm, Alan" },
        { label: "Charles Korba", search: "Korba, Charles" },
        { label: "Daniel Narowitz", search: "Narowitz, Daniel" },
        { label: "Amanda Arnold", search: "Arnold, Amanda" },
        { label: "Stacey Batts", search: "Batts, Stacey" },
        { label: "Asia Hall", search: "Hall, Asia" },
        { label: "Mariah McFadden", search: "McFadden, Mariah" },
        { label: "Tamara Volkonska", search: "Volkonska, Tamara" },
        { label: "Lataijha Thomas", search: "Thomas, Lataijha" }
    ],
  attachmentDocumentShortcuts: [
        { id: 'l3000-btn', label: 'L3000', title: 'L3000 Proof of Delivery', category: 'DME' },
        { id: 'vasc-btn', label: 'Vascular', title: 'Vascular Referral', category: 'Clinical Document' }
    ]
};
window.DANMED_DEFAULT_SHORTCUT_LISTS.taskStaffShortcuts = window.DANMED_DEFAULT_SHORTCUT_LISTS.staffShortcuts;
window.DANMED_ATTACHMENT_CATEGORIES = [
  'ABN', 'ASC', 'Authorization', 'Benefits', 'Billing', 'Blood Work', 'Boost Appeal Letter',
  'CCD / CCDA / CCR', 'Claim', 'Clinical Document / Clinical Results', 'Consent',
  'Correspondence (Custom, Legal, Insurance)', 'Demographics', 'Diabetic Shoe Documentation / Diabetic Shoes',
  'Disability/FMLA Forms', 'DME', 'Email', 'ERA/EOB', 'External Clinical/Visit Note', 'First Report',
  'HIPAA', 'Historical Records', 'Hospital', 'Image', 'Initial Case Reporting',
  'Insurance Card (Primary, Secondary, Tertiary)', 'Invoice', 'Labs', 'Main Patient Multimedia Folder',
  'Medical Clearance for Surgery', 'Migrated Charts', 'Miscellaneous', 'MRI', 'Narcotic Agreement',
  'Office Visit', 'OP NOTES / Operative Notes', 'Orders', 'Orthotics', 'Outbound Faxes',
  'Pathology Report', 'Patient Education / Forms / ID Card / Memos / Photo / Quote', 'Pharmacy Responses',
  'PHI Release', 'Phone Message', 'Physical/Occupational Therapy (including Results)',
  'Practice Appeal Letters', 'Pre-Certification / Pre-Collections Letter', 'Prescription / Prescriptions & Renewals',
  'PSS Docs', 'Quote', 'Radiology (including Results)', 'Referral', 'Report / Reportability Response',
  'Research', 'Surgery Consent and Questionnaire / Surgical Documents', 'TRAKnet Multimedia',
  'Ultrasound Reports', 'Visit Notes', 'Waivers', 'Worker Comp', 'Wound', 'X-Rays'
];
window.DanMedCleanShortcutLists = (lists) => {
  ['staffShortcuts', 'taskStaffShortcuts', 'providerShortcuts'].forEach(key => {
    if (!Array.isArray(lists[key])) return;
    lists[key].forEach(item => {
      if (typeof item.label === 'string') item.label = item.label.replace(/^\u{1F464}\s*/u, '');
    });
  });
  return lists;
};
