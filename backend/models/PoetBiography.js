const mongoose = require("mongoose");

// Enhanced Poet Schema with biographical information
const poetSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    nameInUrdu: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    nameInEnglish: {
      type: String,
      trim: true,
      index: true,
    },
    fullName: {
      type: String,
      trim: true,
    },
    aliases: [
      {
        type: String,
        trim: true,
      },
    ],

    // Biographical Information
    birthDate: {
      year: { type: Number, index: true },
      month: { type: Number },
      day: { type: Number },
      formatted: { type: String }, // e.g., "27 دسمبر 1797"
      hijriDate: { type: String }, // Islamic calendar date
      uncertainty: { type: String }, // "circa", "before", "after"
    },
    deathDate: {
      year: { type: Number, index: true },
      month: { type: Number },
      day: { type: Number },
      formatted: { type: String },
      hijriDate: { type: String },
      uncertainty: { type: String },
    },

    // Geographic Information
    birthPlace: {
      city: { type: String, trim: true },
      region: { type: String, trim: true },
      country: { type: String, trim: true },
      currentName: { type: String, trim: true }, // Modern name if different
      coordinates: {
        latitude: { type: Number },
        longitude: { type: Number },
      },
    },
    deathPlace: {
      city: { type: String, trim: true },
      region: { type: String, trim: true },
      country: { type: String, trim: true },
      currentName: { type: String, trim: true },
      coordinates: {
        latitude: { type: Number },
        longitude: { type: Number },
      },
    },
    residences: [
      {
        place: { type: String, trim: true },
        period: { type: String }, // e.g., "1820-1825"
        significance: { type: String }, // Why they lived there
      },
    ],

    // Literary Information
    era: {
      name: { type: String, index: true }, // e.g., "مغلیہ دور", "جدید دور"
      period: { type: String }, // e.g., "1700-1800"
      description: { type: String },
    },
    literaryMovement: [
      {
        name: { type: String },
        role: { type: String }, // "founder", "member", "leader"
        description: { type: String },
      },
    ],
    genres: [
      {
        name: { type: String, index: true }, // غزل، نظم، قطعہ، etc.
        expertise: {
          type: String,
          enum: ["beginner", "intermediate", "expert", "master"],
        },
        notableWorks: [{ type: String }],
      },
    ],
    languages: [
      {
        language: { type: String, index: true }, // اردو، فارسی، عربی، etc.
        proficiency: {
          type: String,
          enum: ["basic", "fluent", "native", "master"],
        },
        worksInLanguage: { type: Number, default: 0 },
      },
    ],

    // Career and Education
    education: [
      {
        institution: { type: String },
        location: { type: String },
        period: { type: String },
        field: { type: String },
        teachers: [{ type: String }],
      },
    ],
    profession: [
      {
        title: { type: String },
        employer: { type: String },
        period: { type: String },
        description: { type: String },
      },
    ],
    patronage: [
      {
        patron: { type: String }, // Name of patron
        title: { type: String }, // Royal title, position
        period: { type: String },
        benefits: { type: String }, // What they received
        works: [{ type: String }], // Works dedicated to this patron
      },
    ],

    // Family and Relationships
    family: {
      father: { type: String },
      mother: { type: String },
      spouses: [
        {
          name: { type: String },
          marriageYear: { type: Number },
          children: [{ type: String }],
        },
      ],
      children: [
        {
          name: { type: String },
          birthYear: { type: Number },
          profession: { type: String },
          isPoet: { type: Boolean, default: false },
        },
      ],
      siblings: [
        {
          name: { type: String },
          relation: { type: String }, // brother, sister
          isPoet: { type: Boolean, default: false },
        },
      ],
    },

    // Literary Relationships
    teachers: [
      {
        name: { type: String },
        field: { type: String }, // poetry, language, religion
        period: { type: String },
        influence: { type: String },
      },
    ],
    students: [
      {
        name: { type: String },
        field: { type: String },
        period: { type: String },
        isNotable: { type: Boolean, default: false },
      },
    ],
    contemporaries: [
      {
        name: { type: String },
        relationship: { type: String }, // friend, rival, colleague
        collaborations: [{ type: String }],
      },
    ],
    influences: [
      {
        name: { type: String },
        type: { type: String }, // poet, philosopher, religious figure
        influence: { type: String }, // How they influenced
      },
    ],
    influenced: [
      {
        name: { type: String },
        type: { type: String },
        influence: { type: String },
      },
    ],

    // Physical and Personal Characteristics
    physicalDescription: {
      height: { type: String },
      build: { type: String },
      complexion: { type: String },
      distinguishingFeatures: [{ type: String }],
      clothing: { type: String },
    },
    personality: {
      traits: [{ type: String }],
      temperament: { type: String },
      spirituality: { type: String },
      socialNature: { type: String },
    },
    habits: [
      {
        habit: { type: String },
        frequency: { type: String },
        description: { type: String },
      },
    ],

    // Works and Publications
    notableWorks: [
      {
        title: { type: String, required: true },
        titleInUrdu: { type: String },
        type: { type: String }, // دیوان، مثنوی، etc.
        yearWritten: { type: Number },
        yearPublished: { type: Number },
        publisher: { type: String },
        description: { type: String },
        significance: { type: String },
        isLost: { type: Boolean, default: false },
      },
    ],
    collectionsPublished: [
      {
        title: { type: String },
        year: { type: Number },
        publisher: { type: String },
        editor: { type: String },
        description: { type: String },
      },
    ],
    unpublishedWorks: [
      {
        title: { type: String },
        description: { type: String },
        reason: { type: String }, // Why it wasn't published
      },
    ],

    // Historical and Social Context
    historicalEvents: [
      {
        event: { type: String },
        year: { type: Number },
        impact: { type: String }, // How it affected the poet
        poetResponse: { type: String }, // Poet's reaction/works about it
      },
    ],
    socialStatus: {
      class: { type: String }, // noble, middle class, etc.
      wealth: { type: String }, // wealthy, moderate, poor
      socialConnections: [{ type: String }],
      reputation: { type: String },
    },

    // Legacy and Recognition
    awards: [
      {
        name: { type: String },
        year: { type: Number },
        organization: { type: String },
        significance: { type: String },
      },
    ],
    commemorations: [
      {
        type: { type: String }, // statue, street name, institution
        name: { type: String },
        location: { type: String },
        year: { type: Number },
      },
    ],
    modernRecognition: [
      {
        type: { type: String }, // books about them, research, etc.
        title: { type: String },
        author: { type: String },
        year: { type: Number },
      },
    ],

    // Scholarly Information
    criticalOpinions: [
      {
        critic: { type: String },
        opinion: { type: String },
        source: { type: String },
        year: { type: Number },
      },
    ],
    scholarlyWorks: [
      {
        title: { type: String },
        author: { type: String },
        year: { type: Number },
        focus: { type: String },
      },
    ],

    // Media and Images
    images: [
      {
        url: { type: String },
        type: { type: String }, // portrait, manuscript, etc.
        description: { type: String },
        source: { type: String },
        year: { type: Number },
        isHistorical: { type: Boolean, default: false },
      },
    ],
    manuscripts: [
      {
        title: { type: String },
        location: { type: String }, // Where it's kept
        description: { type: String },
        condition: { type: String },
        imageUrls: [{ type: String }],
      },
    ],

    // Technical Information
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    tags: [
      {
        type: String,
        lowercase: true,
        trim: true,
        index: true,
      },
    ],
    searchKeywords: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],

    // Statistics and Metrics
    statistics: {
      totalPoems: { type: Number, default: 0 },
      totalCollections: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0, min: 0, max: 5 },
      totalViews: { type: Number, default: 0 },
      totalLikes: { type: Number, default: 0 },
      studyFrequency: { type: Number, default: 0 }, // How often studied
      influenceScore: { type: Number, default: 0 }, // Calculated influence
    },

    // Classification
    importance: {
      type: String,
      enum: ["legendary", "major", "notable", "minor", "regional"],
      default: "notable",
    },
    status: {
      type: String,
      enum: ["active", "verified", "pending", "archived"],
      default: "pending",
    },
    category: {
      type: String,
      enum: [
        "classical",
        "modern",
        "contemporary",
        "sufi",
        "patriotic",
        "romantic",
      ],
      index: true,
    },

    // Administrative
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    sources: [
      {
        type: { type: String }, // book, article, website, etc.
        title: { type: String },
        author: { type: String },
        url: { type: String },
        reliability: { type: String, enum: ["high", "medium", "low"] },
        notes: { type: String },
      },
    ],
    verified: {
      type: Boolean,
      default: false,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    verificationDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual fields
poetSchema.virtual("age").get(function () {
  if (this.birthDate?.year && this.deathDate?.year) {
    return this.deathDate.year - this.birthDate.year;
  }
  return null;
});

poetSchema.virtual("lifespan").get(function () {
  const birth = this.birthDate?.formatted || `${this.birthDate?.year || "?"}`;
  const death = this.deathDate?.formatted || `${this.deathDate?.year || "?"}`;
  return `${birth} - ${death}`;
});

poetSchema.virtual("isClassical").get(function () {
  return this.deathDate?.year && this.deathDate.year < 1900;
});

poetSchema.virtual("isModern").get(function () {
  return this.deathDate?.year && this.deathDate.year >= 1900;
});

poetSchema.virtual("isContemporary").get(function () {
  return !this.deathDate?.year || this.deathDate.year >= 1950;
});

// Indexes for better performance
poetSchema.index({ name: "text", nameInUrdu: "text", nameInEnglish: "text" });
poetSchema.index({ "birthDate.year": 1, "deathDate.year": 1 });
poetSchema.index({ "genres.name": 1 });
poetSchema.index({ "languages.language": 1 });
poetSchema.index({ era: 1, category: 1 });
poetSchema.index({ importance: 1, status: 1 });
poetSchema.index({ tags: 1 });
poetSchema.index({ createdAt: -1 });

// Pre-save middleware
poetSchema.pre("save", function (next) {
  // Generate slug if not exists
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, "-");
  }

  // Generate search keywords
  this.searchKeywords = [
    this.name,
    this.nameInUrdu,
    this.nameInEnglish,
    this.fullName,
    ...this.aliases,
    this.birthPlace?.city,
    this.era?.name,
  ]
    .filter(Boolean)
    .map((keyword) => keyword.toLowerCase());

  // Generate tags
  const autoTags = [
    this.era?.name,
    this.category,
    ...this.genres.map((g) => g.name),
    ...this.languages.map((l) => l.language),
    this.birthPlace?.city,
    this.birthPlace?.country,
  ]
    .filter(Boolean)
    .map((tag) => tag.toLowerCase());

  this.tags = [...new Set([...this.tags, ...autoTags])];

  next();
});

// Static methods
poetSchema.statics.findByEra = function (era) {
  return this.find({ "era.name": new RegExp(era, "i") });
};

poetSchema.statics.findByGenre = function (genre) {
  return this.find({ "genres.name": new RegExp(genre, "i") });
};

poetSchema.statics.findByLanguage = function (language) {
  return this.find({ "languages.language": new RegExp(language, "i") });
};

poetSchema.statics.findClassical = function () {
  return this.find({
    $or: [{ "deathDate.year": { $lt: 1900 } }, { category: "classical" }],
  });
};

poetSchema.statics.findModern = function () {
  return this.find({
    "deathDate.year": { $gte: 1900, $lt: 1950 },
  });
};

poetSchema.statics.findContemporary = function () {
  return this.find({
    $or: [
      { "deathDate.year": { $gte: 1950 } },
      { "deathDate.year": { $exists: false } },
    ],
  });
};

// Instance methods
poetSchema.methods.addWork = function (work) {
  this.notableWorks.push(work);
  this.statistics.totalPoems += 1;
  return this.save();
};

poetSchema.methods.updateStatistics = function (stats) {
  Object.assign(this.statistics, stats);
  return this.save();
};

poetSchema.methods.addImage = function (imageData) {
  this.images.push(imageData);
  return this.save();
};

module.exports = mongoose.model("PoetBiography", poetSchema);
