import mongoose from "mongoose";

const newsSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  subtitle: {
    type: String,
    trim: true,
    maxlength: 300
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000
  },
  excerpt: {
    type: String,
    maxlength: 500
  },
  
  // Content Type and Category
  type: {
    type: String,
    enum: ["news", "announcement", "event", "poetry_launch", "contest_update", "feature", "interview"],
    required: true
  },
  category: {
    type: String,
    enum: ["platform", "literary", "cultural", "contest", "poet", "community", "technical"],
    required: true
  },
  priority: {
    type: String,
    enum: ["low", "normal", "high", "urgent"],
    default: "normal"
  },
  
  // Author and Publishing
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  editors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Publishing Status
  status: {
    type: String,
    enum: ["draft", "review", "scheduled", "published", "archived"],
    default: "draft"
  },
  publishedAt: Date,
  scheduledFor: Date,
  archivedAt: Date,
  
  // Featured Content
  featured: {
    type: Boolean,
    default: false
  },
  featuredUntil: Date,
  sticky: {
    type: Boolean,
    default: false
  },
  
  // Media
  featuredImage: {
    url: String,
    publicId: String,
    alt: String,
    caption: String
  },
  gallery: [{
    url: String,
    publicId: String,
    alt: String,
    caption: String
  }],
  
  // Related Content
  relatedPoets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Poet'
  }],
  relatedPoems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Poem'
  }],
  relatedContests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest'
  }],
  relatedNews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'News'
  }],
  
  // Tags and Keywords
  tags: [String],
  keywords: [String],
  
  // Engagement
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  shares: {
    type: Number,
    default: 0
  },
  
  // Comments
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    comment: {
      type: String,
      required: true,
      maxlength: 1000
    },
    replies: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reply: {
        type: String,
        required: true,
        maxlength: 500
      },
      repliedAt: {
        type: Date,
        default: Date.now
      }
    }],
    commentedAt: {
      type: Date,
      default: Date.now
    },
    approved: {
      type: Boolean,
      default: true
    }
  }],
  
  // Notifications
  notificationSent: {
    type: Boolean,
    default: false
  },
  notificationSentAt: Date,
  notificationRecipients: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // SEO
  seo: {
    metaTitle: String,
    metaDescription: String,
    slug: {
      type: String,
      unique: true
    },
    canonicalUrl: String
  },
  
  // Analytics
  analytics: {
    dailyViews: [{
      date: Date,
      count: Number
    }],
    referrers: [{
      source: String,
      count: Number
    }],
    readingTime: Number, // in minutes
    bounceRate: Number,
    engagementRate: Number
  },
  
  // Event Information (if type is event)
  eventDetails: {
    startDate: Date,
    endDate: Date,
    location: {
      venue: String,
      address: String,
      city: String,
      country: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    organizer: String,
    registrationRequired: Boolean,
    registrationLink: String,
    maxAttendees: Number,
    currentAttendees: { type: Number, default: 0 }
  },
  
  // Contest Information (if related to contest)
  contestDetails: {
    contest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contest'
    },
    updateType: {
      type: String,
      enum: ["announcement", "deadline_reminder", "results", "winner_announcement"]
    }
  },
  
  // Moderation
  moderationStatus: {
    type: String,
    enum: ["pending", "approved", "rejected", "flagged"],
    default: "pending"
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatedAt: Date,
  moderationNotes: String,
  
  // Translation Support
  translations: [{
    language: {
      type: String,
      enum: ["english", "urdu", "hindi"]
    },
    title: String,
    content: String,
    excerpt: String,
    translatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    translatedAt: Date
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
newsSchema.index({ type: 1, category: 1 });
newsSchema.index({ status: 1, publishedAt: -1 });
newsSchema.index({ featured: 1, priority: 1 });
newsSchema.index({ tags: 1 });
newsSchema.index({ title: 'text', content: 'text', tags: 'text' });

// Virtual for reading time
newsSchema.virtual('estimatedReadingTime').get(function() {
  const wordsPerMinute = 200;
  const wordCount = this.content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
});

// Virtual for like count
newsSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Virtual for comment count
newsSchema.virtual('commentCount').get(function() {
  return this.comments ? this.comments.length : 0;
});

// Virtual for is published
newsSchema.virtual('isPublished').get(function() {
  return this.status === 'published' && this.publishedAt && this.publishedAt <= new Date();
});

// Pre-save middleware
newsSchema.pre('save', function(next) {
  // Generate slug if not provided
  if (!this.seo.slug && this.title) {
    this.seo.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  
  // Generate excerpt if not provided
  if (!this.excerpt && this.content) {
    this.excerpt = this.content.substring(0, 300) + '...';
  }
  
  // Set published date when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  // Calculate reading time
  this.analytics.readingTime = this.estimatedReadingTime;
  
  next();
});

// Methods
newsSchema.methods.incrementViews = function() {
  this.views += 1;
  
  // Update daily views analytics
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayAnalytics = this.analytics.dailyViews.find(
    view => view.date.getTime() === today.getTime()
  );
  
  if (todayAnalytics) {
    todayAnalytics.count += 1;
  } else {
    this.analytics.dailyViews.push({
      date: today,
      count: 1
    });
  }
  
  // Keep only last 30 days
  this.analytics.dailyViews = this.analytics.dailyViews
    .sort((a, b) => b.date - a.date)
    .slice(0, 30);
  
  return this.save();
};

newsSchema.methods.addLike = function(userId) {
  if (!this.likes.some(like => like.user.equals(userId))) {
    this.likes.push({ user: userId });
    return this.save();
  }
  return Promise.resolve(this);
};

newsSchema.methods.removeLike = function(userId) {
  this.likes = this.likes.filter(like => !like.user.equals(userId));
  return this.save();
};

newsSchema.methods.addComment = function(userId, comment) {
  this.comments.push({
    user: userId,
    comment
  });
  return this.save();
};

newsSchema.methods.addReply = function(commentId, userId, reply) {
  const comment = this.comments.id(commentId);
  if (comment) {
    comment.replies.push({
      user: userId,
      reply
    });
    return this.save();
  }
  throw new Error('Comment not found');
};

newsSchema.methods.publish = function() {
  this.status = 'published';
  this.publishedAt = new Date();
  return this.save();
};

newsSchema.methods.schedule = function(publishDate) {
  this.status = 'scheduled';
  this.scheduledFor = publishDate;
  return this.save();
};

newsSchema.methods.archive = function() {
  this.status = 'archived';
  this.archivedAt = new Date();
  return this.save();
};

// Static methods
newsSchema.statics.getPublished = function(limit = 10, category = null) {
  const query = { 
    status: 'published', 
    publishedAt: { $lte: new Date() } 
  };
  
  if (category) {
    query.category = category;
  }
  
  return this.find(query)
    .sort({ featured: -1, sticky: -1, publishedAt: -1 })
    .limit(limit)
    .populate('author', 'name profileImage')
    .populate('relatedPoets', 'name profileImage')
    .populate('relatedContests', 'title status');
};

newsSchema.statics.getFeatured = function(limit = 5) {
  return this.find({
    status: 'published',
    featured: true,
    publishedAt: { $lte: new Date() },
    $or: [
      { featuredUntil: { $exists: false } },
      { featuredUntil: null },
      { featuredUntil: { $gte: new Date() } }
    ]
  })
  .sort({ publishedAt: -1 })
  .limit(limit);
};

newsSchema.statics.getByCategory = function(category, limit = 10) {
  return this.find({
    status: 'published',
    category,
    publishedAt: { $lte: new Date() }
  })
  .sort({ publishedAt: -1 })
  .limit(limit);
};

export default mongoose.model("News", newsSchema);