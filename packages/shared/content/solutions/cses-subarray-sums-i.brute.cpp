#include <vector>

class Solution {
public:
    int subarraySumsI(std::vector<int>& arr, int target) {
        int n = arr.size();
        int count = 0;
        for (int i = 0; i < n; i++) {
            long long s = 0;
            for (int j = i; j < n; j++) {
                s += arr[j];
                if (s == target) count++;
            }
        }
        return count;
    }
};
