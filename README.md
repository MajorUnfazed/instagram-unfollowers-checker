# Instagram Unfollowers Checker

Use one Instagram export to see which accounts you follow that don’t follow you back. With exports from two dates, you can also see which follower usernames appeared or disappeared between them. Your browser reads the files locally. The checker never receives your Instagram credentials or sends your lists to a server.

[Open the checker](https://insta-unfollowers.netlify.app/)

The **Theme** menu follows your device’s appearance by default. Choose **Light** or **Dark** to save a preference in this browser. You can switch themes while reviewing results.

## Prepare your export

1. Open [Instagram exports in Meta Accounts Center](https://accountscenter.instagram.com/info_and_permissions/dyi/) and request an export to your device for the Instagram profile you want to check.
2. Select **Followers and following**, choose **All time** for the date range, and set the format to **JSON**.
3. Download the ZIP when it’s ready. You can open it directly in the checker.

## Check follow-backs

Choose **Who doesn’t follow me back?** and drop your ZIP into **Instagram export**, or click **Choose ZIP**. The checker reads the followers and following lists from the archive and displays the results automatically.

Search by username or use **Previous** and **Next** to browse up to 100 accounts per page. Each row links to the account’s profile. **Download full results (CSV)** includes every result across all pages and filters.

The results reflect the account lists at the time of the export. An account on the list may never have followed you.

## Compare two exports

Choose **What changed since my last export?** and drop one ZIP into **Older export** and one into **Newer export**. Use exports from the same account. This comparison only needs the followers list from each date.

Select **Missing** for usernames found only in the older export or **New** for usernames found only in the newer one. Search works within the selected group. A renamed account can appear in both groups under different usernames. The CSV always includes both groups and a `Change` column.

## Use extracted JSON files

Select **Use extracted JSON files** and look in `connections/followers_and_following/`. Select every followers part for each export. For a follow-back check, also select `following.json`. Click **Analyze** or **Compare exports**.

The checker flags gaps such as `followers_1.json` and `followers_3.json` without `followers_2.json`. It can’t detect an omitted final part, so check the original folder when selecting files by hand.

## Large exports

ZIP and JSON imports read the account lists in chunks. The checker parses batches of records, keeps their usernames, and releases the records. During import, you can see which file is being read, cancel the comparison, and retry with the same files.

The checker keeps unique usernames in memory and sorts the differences alphabetically. Memory use still grows with the number of distinct accounts and results. Search scans the selected group and displays up to 100 matches at a time.

For 100,000 or more result rows, browsers with a file-save picker can write the CSV directly to disk in chunks. Other browsers assemble a downloadable file locally and need space for the complete CSV.

**Tested with 10 million followers and 10 million following.** A synthetic export with 9.9 million usernames in common produced 100,000 follow-back results. On a Windows desktop with 16 GB of RAM running Chrome 158, the first page appeared in about 43 seconds from two extracted JSON files (2.39 GB total) and 28 seconds from a ZIP (113 MB). Each format was timed once. Searching found the last result, and the streamed CSV contained all 100,000 rows. Smaller devices and exports with more differences can have substantially different memory requirements.

## Run locally

```sh
git clone https://github.com/MajorUnfazed/instagram-unfollowers-checker.git
cd instagram-unfollowers-checker
```

Open `index.html` in your browser. The checker uses plain HTML, CSS, and JavaScript and runs offline. Opening a profile link requires an internet connection.

## License

[MIT](LICENSE)

The bundled archive reader and streaming JSON parser have their own licenses. [zip.js license](vendor/zip.js-2.25.0/LICENSE) · [@streamparser/json license](vendor/streamparser-json-0.0.26/LICENSE)
