import { body, param, validationResult } from "express-validator";

const MAX_TEXT_LENGTH = 8000;

/** Express middleware that surfaces express-validator errors as JSON. */
export const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(400).json({
    success: false,
    message: "Invalid request.",
    errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
  });
};

/** Validation chain for POST /api/tts/generate */
export const validateGenerate = [
  body("text")
    .exists().withMessage("text is required.")
    .bail()
    .isString().withMessage("text must be a string.")
    .bail()
    .trim()
    .isLength({ min: 1, max: MAX_TEXT_LENGTH })
    .withMessage(`text must be 1-${MAX_TEXT_LENGTH} characters.`),

  body("mode")
    .optional()
    .isIn(["normal", "poetry"]).withMessage('mode must be "normal" or "poetry".'),

  body("voice")
    .optional()
    .isString().withMessage("voice must be a string.")
    .isLength({ max: 100 }).withMessage("voice too long."),

  body("speed")
    .optional()
    .isFloat({ min: 0.5, max: 2 })
    .withMessage("speed must be between 0.5 and 2.")
    .toFloat(),

  body("provider")
    .optional()
    .isIn(["auto", "google", "elevenlabs", "edge", "gtts"])
    .withMessage("provider must be auto | google | elevenlabs | edge | gtts."),

  body("language")
    .optional()
    .isString()
    .matches(/^[a-zA-Z-]{2,10}$/)
    .withMessage("language must be a BCP-47 code like ur-PK."),

  handleValidation,
];

/** Validation chain for endpoints that take a Mongo :id param */
export const validateMongoId = [
  param("id")
    .exists().withMessage("id is required.")
    .bail()
    .isMongoId().withMessage("id must be a valid Mongo ObjectId."),
  handleValidation,
];

/** Validation chain for the audio-file streaming route */
export const validateAudioFilename = [
  param("filename")
    .exists().withMessage("filename is required.")
    .bail()
    .matches(/^[a-zA-Z0-9_.-]+\.mp3$/)
    .withMessage("filename must be a safe .mp3 filename."),
  handleValidation,
];
