import mongoose from "mongoose";

const poetSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  penName: {
    type: String,
    trim: true,
    maxlength: 100
  },
  fullName: {
    type: String,
    trim: true,
    maxlength: 200
  },
  
  // Personal Details
  dateOfBirth: Date,
  dateOfDeath: Date,
  isDeceased: {
    type: Boolean,
    default: false
  },
  birthPlace: {
    city: String,
    region: String,
    country: String
  },
  nationality: String,
  languages: [{
    type: String,
    enum: ["urdu", "punjabi", "other"]
  }],
  
  // Biography
  bio: {
    type: String,
    maxlength: 5000
  },
  shortBio: {
    type: String,
    maxlength: 500
  },
  era: {
    type: String,
    enum: ["classical", "modern", "contemporary", "progressive", "traditional"],
    required: true
  },
  period: {
    from: Number, // Year
    to: Number    // Year
  },
  
  // Literary Information
  poeticStyle: [{
    type: String,
    enum: ["ghazal", "nazm", "rubai", "qawwali", "marsiya", "salam", "hamd", "naat", "free-verse"]
  }],
  schoolOfThought: {
    type: String,
    enum: ["romantic", "progressive", "traditional", "modern", "sufi", "political"]
  },
  influences: [String], // Names of poets who influenced them
  influenced: [String], // Names of poets they influenced
  
  // Media and Visual Content
  profileImage: {
    url: String,
    publicId: String
  },
  gallery: [{
    url: String,
    publicId: String,
    caption: String,
    type: {
      type: String,
      enum: ["photo", "manuscript", "calligraphy", "document"]
    }
  }],
  
  // Professional Information
  education: [{
    institution: String,
    degree: String,
    year: Number,
    subject: String
  }],
  profession: String,
  awards: [{
    name: String,
    year: Number,
    description: String,
    awardedBy: String
  }],
  publications: [{
    title: String,
    year: Number,
    publisher: String,
    type: {
      type: String,
      enum: ["book", "collection", "anthology", "magazine", "journal"]
    }
  }],
  
  // Social and Professional Network
  contemporaries: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Poet'
  }],
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Poet'
  }],
  teachers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Poet'
  }],
  
  // Digital Presence
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Link to user account if living poet
  },
  website: String,
  socialLinks: {
    facebook: String,
    twitter: String,
    instagram: String,
    youtube: String
  },
  
  // Memorial Information (for deceased poets)
  memorial: {
    isMemorial: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    maintainedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    tribute: {
      type: String,
      maxlength: 2000
    },
    graveLocation: String,
    memorialSites: [String]
  },
  
  // Followers
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  followersCount: {
    type: Number,
    default: 0
  },
  
  // Statistics
  stats: {
    totalPoems: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
    totalLikes: { type: Number, default: 0 },
    followers: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 }
  },
  
  // Verification and Status
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  status: {
    type: String,
    enum: ["active", "inactive", "pending", "disputed"],
    default: "active"
  },
  
  // Search and Discovery
  tags: [String],
  searchKeywords: [String],
  featured: {
    type: Boolean,
    default: false
  },
  featuredAt: Date,
  
  // Content Moderation
  reportedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    reportedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Analytics
  analytics: {
    profileViews: { type: Number, default: 0 },
    monthlyViews: [{
      month: String, // YYYY-MM format
      views: Number
    }],
    topPoems: [{
      poem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Poem'
      },
      views: Number
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
poetSchema.index({ name: 'text', penName: 'text', fullName: 'text', bio: 'text' });
poetSchema.index({ era: 1, isDeceased: 1 });
poetSchema.index({ 'memorial.isMemorial': 1 });
poetSchema.index({ featured: 1, 'stats.totalViews': -1 });
poetSchema.index({ isVerified: 1, status: 1 });

// Virtual for display name
poetSchema.virtual('displayName').get(function() {
  return this.penName || this.name;
});

// Virtual for full lifespan
poetSchema.virtual('lifespan').get(function() {
  if (this.dateOfBirth) {
    const birthYear = this.dateOfBirth.getFullYear();
    const deathYear = this.dateOfDeath ? this.dateOfDeath.getFullYear() : 'Present';
    return `${birthYear} - ${deathYear}`;
  }
  return '';
});

// Virtual for age
poetSchema.virtual('age').get(function() {
  if (this.dateOfBirth) {
    const endDate = this.dateOfDeath || new Date();
    const age = endDate.getFullYear() - this.dateOfBirth.getFullYear();
    return age;
  }
  return null;
});

// Pre-save middleware
poetSchema.pre('save', function(next) {
  // Update search keywords
  this.searchKeywords = [
    this.name,
    this.penName,
    this.fullName,
    ...this.tags
  ].filter(Boolean).map(keyword => keyword.toLowerCase());
  
  // Set memorial status
  if (this.isDeceased && !this.memorial.isMemorial) {
    this.memorial.isMemorial = true;
  }
  
  next();
});

// Methods
poetSchema.methods.incrementProfileViews = function() {
  this.analytics.profileViews += 1;
  
  // Update monthly views
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const monthlyView = this.analytics.monthlyViews.find(mv => mv.month === currentMonth);
  
  if (monthlyView) {
    monthlyView.views += 1;
  } else {
    this.analytics.monthlyViews.push({
      month: currentMonth,
      views: 1
    });
  }
  
  // Keep only last 12 months
  this.analytics.monthlyViews = this.analytics.monthlyViews
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 12);
  
  return this.save();
};

poetSchema.methods.updateStats = async function() {
  const Poem = mongoose.model('Poem');
  
  const stats = await Poem.aggregate([
    { $match: { poet: this._id, published: true } },
    {
      $group: {
        _id: null,
        totalPoems: { $sum: 1 },
        totalViews: { $sum: '$views' },
        totalLikes: { $sum: { $size: '$likes' } },
        averageRating: { $avg: '$averageRating' }
      }
    }
  ]);
  
  if (stats.length > 0) {
    this.stats.totalPoems = stats[0].totalPoems;
    this.stats.totalViews = stats[0].totalViews;
    this.stats.totalLikes = stats[0].totalLikes;
    this.stats.averageRating = stats[0].averageRating || 0;
  }
  
  return this.save();
};

const Poet = mongoose.model("Poet", poetSchema);

export default Poet;
