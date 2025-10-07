import mongoose from "mongoose";

const contestSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  shortDescription: {
    type: String,
    maxlength: 300
  },
  
  // Contest Details
  theme: {
    type: String,
    required: true,
    maxlength: 100
  },
  category: {
    type: String,
    enum: ["ghazal", "nazm", "rubai", "free-verse", "all"],
    required: true
  },
  difficulty: {
    type: String,
    enum: ["beginner", "intermediate", "advanced", "all"],
    default: "all"
  },
  
  // Organizer Information
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  coOrganizers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  sponsors: [{
    name: String,
    logo: String,
    website: String
  }],
  
  // Timeline
  registrationStart: {
    type: Date,
    required: true
  },
  registrationEnd: {
    type: Date,
    required: true
  },
  submissionStart: {
    type: Date,
    required: true
  },
  submissionEnd: {
    type: Date,
    required: true
  },
  votingStart: Date,
  votingEnd: Date,
  resultDate: Date,
  
  // Rules and Guidelines
  rules: [{
    type: String,
    maxlength: 500
  }],
  submissionGuidelines: [{
    type: String,
    maxlength: 500
  }],
  judgingCriteria: [{
    criterion: String,
    weight: Number, // percentage
    description: String
  }],
  
  // Prizes and Rewards
  prizes: [{
    position: {
      type: String,
      enum: ["1st", "2nd", "3rd", "honorable_mention", "special"]
    },
    title: String,
    description: String,
    prize: String,
    monetaryValue: Number
  }],
  
  // Participation
  maxParticipants: Number,
  minAge: Number,
  maxAge: Number,
  eligibilityCriteria: [String],
  entryFee: {
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "PKR" }
  },
  
  // Participants and Submissions
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending"
    }
  }],
  submissions: [{
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    poem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Poem'
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ["submitted", "under_review", "qualified", "disqualified"],
      default: "submitted"
    }
  }],
  
  // Voting and Judging
  votingType: {
    type: String,
    enum: ["public", "jury", "hybrid"],
    default: "public"
  },
  judges: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: String,
    expertise: String
  }],
  votes: [{
    voter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    submission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Poem'
    },
    score: Number,
    comment: String,
    votedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Results
  results: [{
    submission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Poem'
    },
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    position: Number,
    score: Number,
    prize: String,
    feedback: String
  }],
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  runnerUps: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Contest Status
  status: {
    type: String,
    enum: ["draft", "upcoming", "registration_open", "submission_open", "voting", "completed", "cancelled"],
    default: "draft"
  },
  featured: {
    type: Boolean,
    default: false
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  
  // Media
  bannerImage: {
    url: String,
    publicId: String
  },
  gallery: [{
    url: String,
    publicId: String,
    caption: String
  }],
  
  // Analytics
  analytics: {
    views: { type: Number, default: 0 },
    registrations: { type: Number, default: 0 },
    submissions: { type: Number, default: 0 },
    votes: { type: Number, default: 0 },
    socialShares: { type: Number, default: 0 }
  },
  
  // Social Media
  hashtags: [String],
  socialPosts: [{
    platform: {
      type: String,
      enum: ["facebook", "twitter", "instagram", "linkedin"]
    },
    postId: String,
    url: String,
    engagements: Number
  }],
  
  // Notifications
  notifications: [{
    type: {
      type: String,
      enum: ["registration_open", "submission_deadline", "voting_open", "results_announced"]
    },
    sentAt: Date,
    recipientCount: Number
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
contestSchema.index({ status: 1, registrationStart: 1 });
contestSchema.index({ category: 1, status: 1 });
contestSchema.index({ featured: 1, submissionEnd: -1 });
contestSchema.index({ organizer: 1 });

// Virtual for participation count
contestSchema.virtual('participantCount').get(function() {
  return this.participants ? this.participants.length : 0;
});

// Virtual for submission count
contestSchema.virtual('submissionCount').get(function() {
  return this.submissions ? this.submissions.length : 0;
});

// Virtual for days remaining
contestSchema.virtual('daysRemaining').get(function() {
  if (this.submissionEnd) {
    const now = new Date();
    const diffTime = this.submissionEnd - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }
  return 0;
});

// Pre-save middleware
contestSchema.pre('save', function(next) {
  // Update analytics counts
  this.analytics.registrations = this.participants.length;
  this.analytics.submissions = this.submissions.length;
  this.analytics.votes = this.votes.length;
  
  // Auto-update status based on dates
  const now = new Date();
  if (this.status === 'upcoming' && now >= this.registrationStart) {
    this.status = 'registration_open';
  }
  if (this.status === 'registration_open' && now >= this.submissionStart) {
    this.status = 'submission_open';
  }
  if (this.status === 'submission_open' && now > this.submissionEnd) {
    if (this.votingStart && now >= this.votingStart) {
      this.status = 'voting';
    } else {
      this.status = 'completed';
    }
  }
  if (this.status === 'voting' && this.votingEnd && now > this.votingEnd) {
    this.status = 'completed';
  }
  
  next();
});

// Methods
contestSchema.methods.canUserParticipate = function(user) {
  const now = new Date();
  
  // Check if registration is open
  if (now < this.registrationStart || now > this.registrationEnd) {
    return { can: false, reason: 'Registration period is closed' };
  }
  
  // Check if user is already registered
  if (this.participants.some(p => p.user.equals(user._id))) {
    return { can: false, reason: 'Already registered' };
  }
  
  // Check max participants
  if (this.maxParticipants && this.participants.length >= this.maxParticipants) {
    return { can: false, reason: 'Contest is full' };
  }
  
  // Check age eligibility
  if (user.dateOfBirth) {
    const age = new Date().getFullYear() - user.dateOfBirth.getFullYear();
    if (this.minAge && age < this.minAge) {
      return { can: false, reason: 'Below minimum age requirement' };
    }
    if (this.maxAge && age > this.maxAge) {
      return { can: false, reason: 'Above maximum age requirement' };
    }
  }
  
  return { can: true };
};

contestSchema.methods.addParticipant = function(userId) {
  if (!this.participants.some(p => p.user.equals(userId))) {
    this.participants.push({ user: userId });
    return this.save();
  }
  return Promise.resolve(this);
};

contestSchema.methods.addSubmission = function(userId, poemId) {
  // Check if user can submit
  const isParticipant = this.participants.some(p => p.user.equals(userId));
  if (!isParticipant) {
    throw new Error('User is not a participant');
  }
  
  const now = new Date();
  if (now < this.submissionStart || now > this.submissionEnd) {
    throw new Error('Submission period is closed');
  }
  
  // Remove existing submission if any
  this.submissions = this.submissions.filter(s => !s.participant.equals(userId));
  
  // Add new submission
  this.submissions.push({
    participant: userId,
    poem: poemId
  });
  
  return this.save();
};

export default mongoose.model("Contest", contestSchema);