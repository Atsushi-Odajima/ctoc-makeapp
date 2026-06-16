'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Camera, Plus, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InterestBadge } from '@/components/profile/InterestBadge';
import { Interest } from '@/types';
import toast from 'react-hot-toast';

const PHOTO_PLACEHOLDERS = [
  'https://images.unsplash.com/photo-1494790108755-2616b612b977?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=400&h=600&fit=crop',
];

type Step = 'basics' | 'gender' | 'photos' | 'bio' | 'interests' | 'preferences' | 'done';
const STEPS: Step[] = ['basics', 'gender', 'photos', 'bio', 'interests', 'preferences', 'done'];

interface FormData {
  name: string;
  birthdate: string;
  gender: string;
  lookingFor: string;
  photos: string[];
  bio: string;
  interests: string[];
  location: string;
  minAge: number;
  maxAge: number;
  maxDistance: number;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [availableInterests, setAvailableInterests] = useState<Interest[]>([]);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    birthdate: '',
    gender: '',
    lookingFor: 'everyone',
    photos: [],
    bio: '',
    interests: [],
    location: '',
    minAge: 18,
    maxAge: 50,
    maxDistance: 50,
  });

  useEffect(() => {
    fetch('/api/interests')
      .then((r) => r.json())
      .then((data) => setAvailableInterests(data))
      .catch(console.error);
  }, []);

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 2;
  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;

  const update = (key: keyof FormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const addPhoto = () => {
    if (formData.photos.length >= 6) return;
    const randomPhoto = PHOTO_PLACEHOLDERS[formData.photos.length % PHOTO_PLACEHOLDERS.length];
    update('photos', [...formData.photos, randomPhoto]);
  };

  const removePhoto = (index: number) => {
    update('photos', formData.photos.filter((_, i) => i !== index));
  };

  const toggleInterest = (interestId: string) => {
    const current = formData.interests;
    if (current.includes(interestId)) {
      update('interests', current.filter((id) => id !== interestId));
    } else if (current.length < 10) {
      update('interests', [...current, interestId]);
    } else {
      toast.error('You can select up to 10 interests');
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'basics': return formData.name.trim().length >= 2 && formData.birthdate;
      case 'gender': return formData.gender;
      case 'photos': return formData.photos.length >= 1;
      case 'bio': return true;
      case 'interests': return formData.interests.length >= 1;
      case 'preferences': return true;
      default: return true;
    }
  };

  const handleNext = async () => {
    if (isLastStep) {
      await handleSubmit();
      return;
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          onboardingDone: true,
          interests: formData.interests,
        }),
      });

      if (!res.ok) throw new Error('Failed to save profile');

      setCurrentStep(STEPS.length - 1);
    } catch (error) {
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'basics':
        return (
          <div className="space-y-4">
            <Input
              label="Your Name"
              placeholder="What do people call you?"
              value={formData.name}
              onChange={(e) => update('name', e.target.value)}
            />
            <Input
              label="Date of Birth"
              type="date"
              value={formData.birthdate}
              onChange={(e) => update('birthdate', e.target.value)}
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
            />
            <Input
              label="Location (optional)"
              placeholder="City, Country"
              value={formData.location}
              onChange={(e) => update('location', e.target.value)}
            />
          </div>
        );

      case 'gender':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">I am a...</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'male', label: 'Man', emoji: '👨' },
                  { value: 'female', label: 'Woman', emoji: '👩' },
                  { value: 'other', label: 'Other', emoji: '🧑' },
                ].map(({ value, label, emoji }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update('gender', value)}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                      formData.gender === value
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">I'm looking for...</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'male', label: 'Men', emoji: '👨' },
                  { value: 'female', label: 'Women', emoji: '👩' },
                  { value: 'everyone', label: 'Everyone', emoji: '🌈' },
                ].map(({ value, label, emoji }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update('lookingFor', value)}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                      formData.lookingFor === value
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'photos':
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Add at least 1 photo. Your main photo is the first one.</p>
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => {
                const photo = formData.photos[i];
                return (
                  <div
                    key={i}
                    className="aspect-[3/4] rounded-2xl overflow-hidden relative bg-slate-100 border-2 border-dashed border-slate-200"
                  >
                    {photo ? (
                      <>
                        <img src={photo} alt="" className="w-full h-full object-cover" />
                        {i === 0 && (
                          <div className="absolute top-1 left-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                            Main
                          </div>
                        )}
                        <button
                          onClick={() => removePhoto(i)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={addPhoto}
                        className="w-full h-full flex flex-col items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <Plus className="w-6 h-6 mb-1" />
                        <span className="text-[10px]">Add photo</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 text-center">
              Demo: Click the + to add placeholder photos
            </p>
          </div>
        );

      case 'bio':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">About You</label>
              <textarea
                value={formData.bio}
                onChange={(e) => update('bio', e.target.value)}
                placeholder="Tell potential matches about yourself... What makes you unique? What are you looking for?"
                rows={5}
                maxLength={500}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              />
              <p className="text-right text-xs text-slate-400 mt-1">
                {formData.bio.length}/500
              </p>
            </div>
            <p className="text-xs text-slate-400">
              Tip: Profiles with bios get 3x more matches!
            </p>
          </div>
        );

      case 'interests':
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Select your interests ({formData.interests.length}/10 selected)
            </p>
            <div className="flex flex-wrap gap-2 max-h-80 overflow-y-auto">
              {availableInterests.map((interest) => (
                <InterestBadge
                  key={interest.id}
                  interest={interest}
                  selected={formData.interests.includes(interest.id)}
                  onClick={() => toggleInterest(interest.id)}
                />
              ))}
            </div>
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Age Range: {formData.minAge} - {formData.maxAge}
              </label>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Min Age</span>
                    <span>{formData.minAge}</span>
                  </div>
                  <input
                    type="range"
                    min={18}
                    max={formData.maxAge - 1}
                    value={formData.minAge}
                    onChange={(e) => update('minAge', parseInt(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Max Age</span>
                    <span>{formData.maxAge}</span>
                  </div>
                  <input
                    type="range"
                    min={formData.minAge + 1}
                    max={80}
                    value={formData.maxAge}
                    onChange={(e) => update('maxAge', parseInt(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Max Distance: {formData.maxDistance} km
              </label>
              <input
                type="range"
                min={5}
                max={200}
                step={5}
                value={formData.maxDistance}
                onChange={(e) => update('maxDistance', parseInt(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>5 km</span>
                <span>200 km</span>
              </div>
            </div>
          </div>
        );

      case 'done':
        return (
          <div className="text-center py-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <Check className="w-12 h-12 text-white" strokeWidth={3} />
            </motion.div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">You're all set!</h2>
            <p className="text-slate-500 mb-8">
              Your profile is ready. Start discovering amazing people near you!
            </p>
            <Button
              size="lg"
              onClick={() => router.push('/discover')}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              Start Discovering 🎉
            </Button>
          </div>
        );
    }
  };

  const stepInfo = {
    basics: { title: 'The Basics', subtitle: "Let's start with the essentials" },
    gender: { title: 'Identity & Preference', subtitle: 'Who are you, and who do you seek?' },
    photos: { title: 'Your Photos', subtitle: 'Show your best self' },
    bio: { title: 'Your Story', subtitle: 'Let people know who you are' },
    interests: { title: 'Your Interests', subtitle: 'Connect over shared passions' },
    preferences: { title: 'Discovery Settings', subtitle: 'Customize who you see' },
    done: { title: 'Profile Complete!', subtitle: 'Ready to find your match' },
  };

  const info = stepInfo[step];

  return (
    <div className="min-h-screen bg-[#F0F4FF] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-slate-800">{info.title}</h1>
              <p className="text-sm text-slate-500">{info.subtitle}</p>
            </div>
            <span className="text-sm text-slate-400">
              {step !== 'done' ? `${currentStep + 1}/${STEPS.length - 1}` : 'Done!'}
            </span>
          </div>
          {step !== 'done' && (
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      {step !== 'done' && (
        <div className="bg-white border-t border-slate-100 px-4 py-4 pb-safe">
          <div className="max-w-md mx-auto flex gap-3">
            {currentStep > 0 && (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="flex-shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}
            <Button
              size="lg"
              onClick={handleNext}
              disabled={!canProceed()}
              loading={isLoading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              {isLastStep ? 'Complete Profile' : 'Continue'}
              {!isLastStep && <ChevronRight className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
