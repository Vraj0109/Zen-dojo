#include <vector>
#include <numeric>

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
    int commonDivisors(vector<int>& arr) {
        int n = arr.size();
        int maxGcd = 1;
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                int g = gcd(arr[i], arr[j]);
                if (g > maxGcd) maxGcd = g;
            }
        }
        return maxGcd;
    }
};
