#include <vector>

using namespace std;

class Solution {
    int gcd(int a, int b) {
        while (b) {
            a %= b;
            swap(a, b);
        }
        return a;
    }
public:
    long long countingCoprimePairs(vector<int>& arr) {
        int n = arr.size();
        long long count = 0;
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                if (gcd(arr[i], arr[j]) == 1) {
                    count++;
                }
            }
        }
        return count;
    }
};
