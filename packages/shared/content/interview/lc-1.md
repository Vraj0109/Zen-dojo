---
id: lc-1
pattern: hash-map
difficulty: easy
optimal: "O(n) time, O(n) space"
reviewed: true
---

## Clarify first

- Can the array be empty or have fewer than two elements? (No, guaranteed length >= 2).
- Can there be multiple valid pairs that sum to the target? (No, guaranteed exactly one unique pair).
- Can the same element at position i be used twice to form the target? (No, must use two distinct indices i and j).
- Are the integers guaranteed to fit in standard 32-bit signed integers? (Values and target range from -10^9 to 10^9, so sums can reach +/-2*10^9, fitting in standard 32-bit integers, though 64-bit integers prevent overflow during subtraction).
- In what order should the two indices be returned? (Any order is acceptable).

## Examples to say out loud

- Normal case: `nums = [2, 7, 11, 15]`, `target = 9`. Walking from index 0, at index 0 we have 2, complement is 7. We store 2 at index 0. At index 1 we see 7, complement is 2 which is stored with index 0. We return `[0, 1]`.
- Edge case: Duplicate values like `nums = [3, 3]`, `target = 6`. When visiting index 0, 3 is stored. At index 1, the complement 3 is found in our record at index 0, so `[0, 1]` is correctly returned without colliding on index.
- Negative numbers: `nums = [-1, -2, -3, -4, -5]`, `target = -8`. At index 4 (-5), complement is `-8 - (-5) = -3`, which was stored at index 2, returning `[2, 4]`.

## Brute force

The immediate baseline is to check all possible pairs of indices `(i, j)` where `i < j`. For each pair, compute `nums[i] + nums[j]` and compare against `target`. There are `n * (n - 1) / 2` pairs, yielding `O(n^2)` time and `O(1)` space. For `n = 10,000`, `n^2` is `10^8` operations, which is too slow and unnecessary because we repeatedly scan for a single target value.

## The key observation

For any element `nums[i]`, its required partner is fixed: `complement = target - nums[i]`. Instead of scanning the entire remaining array to locate this complement, we can query a hash map in average `O(1)` time. By checking whether `complement` was already seen before recording `nums[i]`, we avoid using an element twice and find the pair in a single forward pass.

## Optimal approach

1. Initialize an empty hash map `seen` mapping an integer value to its first-seen index.
2. Iterate through `nums` with index `i`:
   a. Compute `complement = target - nums[i]`.
   b. Look up `complement` in `seen`. If present, return `[seen[complement], i]`.
   c. If not present, insert `seen[nums[i]] = i`.
3. If loop finishes without finding a pair, return an empty array (unreachable per problem constraints).

Complexity:
- Time: `O(n)` because we iterate through the list of `n` numbers once and perform average `O(1)` hash map lookups and insertions.
- Space: `O(n)` auxiliary space to store at most `n` entries in the hash map.

## Code walkthrough

In the reference implementation:
- `unordered_map<long long, int> seen;`: tracks previously encountered values and their indices.
- `auto it = seen.find((long long)target - nums[i]);`: checks in `O(1)` time if the required partner was already visited.
- `if (it != seen.end()) return {it->second, i};`: immediately terminates upon discovering the matching pair.
- `seen[nums[i]] = i;`: registers the current number only after the check, ensuring distinct indices.

## Test it out loud

- `nums = [3, 2, 4], target = 6`:
  - `i = 0`: `nums[0] = 3`, complement 3 not in `seen`. Store `3 -> 0`.
  - `i = 1`: `nums[1] = 2`, complement 4 not in `seen`. Store `2 -> 1`.
  - `i = 2`: `nums[2] = 4`, complement `6 - 4 = 2` found at index 1. Return `[1, 2]`.
- `nums = [0, 4, 3, 0], target = 0`:
  - `i = 0`: `nums[0] = 0`, complement 0 not in `seen`. Store `0 -> 0`.
  - `i = 1, 2`: neither 4 nor 3 has complement in `seen`.
  - `i = 3`: `nums[3] = 0`, complement 0 found at index 0. Return `[0, 3]`.

## Follow-ups

- What if the input array is already sorted?
  Use two pointers from left and right inward in `O(n)` time and `O(1)` extra space.
- What if multiple pairs exist and we need all unique index pairs or value pairs?
  Store lists of indices in the map or sort first, skipping identical values to avoid duplicate result sets.
- What if memory is severely constrained and `O(n)` extra space is disallowed?
  If in-place modification is allowed, sort in `O(n log n)` with two pointers, or accept `O(n^2)` brute force.

## Common mistakes

- Inserting `nums[i]` into the map before querying `target - nums[i]`, which causes a number to match with itself if `target == 2 * nums[i]`.
- Assuming the array elements are all positive; negative values change direction of sums but the complement formula remains unchanged.
- Over-complicating with a two-pass hash map where keys collide on duplicates before second pass lookups.

## Further reading

- C++ `std::unordered_map` documentation for hash table performance and collision considerations.
- Two-pointer technique overview for sorted array variants.
