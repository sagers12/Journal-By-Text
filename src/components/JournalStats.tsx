import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, FileText, Type, Camera } from "lucide-react";
import type { Entry } from "@/types/entry";

interface JournalStatsProps {
  entries: Entry[];
}

export const JournalStats = ({ entries }: JournalStatsProps) => {
  const calculateStats = () => {
    if (entries.length === 0) {
      return {
        currentStreak: 0,
        totalDays: 0,
        totalPhotos: 0,
        totalWordCount: 0
      };
    }

    // Calculate total unique days (not total entries)
    const uniqueDates = [...new Set(entries.map(entry => entry.entry_date))];
    const totalDays = uniqueDates.length;

    // Calculate total photos
    const totalPhotos = entries.reduce((total, entry) => {
      return total + (entry.photos?.length || 0);
    }, 0);

    // Calculate total word count
    const totalWordCount = entries.reduce((total, entry) => {
      const wordCount = entry.content.trim().split(/\s+/).filter(word => word.length > 0).length;
      return total + wordCount;
    }, 0);

    // Calculate current streak
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
    );

    let currentStreak = 0;
    const today = new Date();
    
    // Get unique entry dates (in case there are multiple entries per day)
    const sortedUniqueDates = [...new Set(sortedEntries.map(entry => entry.entry_date))].sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );

    if (sortedUniqueDates.length === 0) return { currentStreak: 0, totalDays, totalPhotos, totalWordCount };

    // Check if there's an entry today or yesterday
    const latestEntryDate = new Date(sortedUniqueDates[0]);
    const daysDifference = Math.floor((today.getTime() - latestEntryDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // If the latest entry is more than 1 day old, streak is broken
    if (daysDifference > 1) {
      return { currentStreak: 0, totalDays, totalPhotos, totalWordCount };
    }

    // Calculate streak starting from the most recent entry
    let streakDate = new Date(sortedUniqueDates[0]);
    currentStreak = 1;

    for (let i = 1; i < sortedUniqueDates.length; i++) {
      const prevDate = new Date(sortedUniqueDates[i]);
      const expectedDate = new Date(streakDate);
      expectedDate.setDate(expectedDate.getDate() - 1);

      if (prevDate.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
        currentStreak++;
        streakDate = prevDate;
      } else {
        break;
      }
    }

    return { currentStreak, totalDays, totalPhotos, totalWordCount };
  };

  const { currentStreak, totalDays, totalPhotos, totalWordCount } = calculateStats();

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-orange-800">
            Current Streak
          </CardTitle>
          <Calendar className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-900">
            {formatNumber(currentStreak)}
          </div>
          <p className="text-xs text-orange-700 mt-1">
            {currentStreak === 1 ? 'day' : 'days'} in a row
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-blue-800">
            Total Days
          </CardTitle>
          <FileText className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-900">
            {formatNumber(totalDays)}
          </div>
          <p className="text-xs text-blue-700 mt-1">
            {totalDays === 1 ? 'day' : 'days'} journaling
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-purple-800">
            Total Photos
          </CardTitle>
          <Camera className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-900">
            {formatNumber(totalPhotos)}
          </div>
          <p className="text-xs text-purple-700 mt-1">
            {totalPhotos === 1 ? 'photo' : 'photos'} saved
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-green-800">
            Total Words
          </CardTitle>
          <Type className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-900">
            {formatNumber(totalWordCount)}
          </div>
          <p className="text-xs text-green-700 mt-1">
            words written
          </p>
        </CardContent>
      </Card>
    </div>
  );
};