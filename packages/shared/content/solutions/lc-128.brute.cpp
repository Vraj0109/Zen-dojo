#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int longestConsecutive(vector<int>& nums) {
        if (nums.empty()) return 0;
        vector<int> a = nums;
        sort(a.begin(), a.end());
        int maxStreak = 1;
        int currentStreak = 1;
        for (size_t i = 1; i < a.size(); i++) {
            if (a[i] == a[i - 1]) continue;
            if (a[i] == a[i - 1] + 1) {
                currentStreak++;
                maxStreak = max(maxStreak, currentStreak);
            } else {
                currentStreak = 1;
            }
        }
        return maxStreak;
    }
};
