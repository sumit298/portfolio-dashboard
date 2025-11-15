const express = require("express");
const xlsx = require("xlsx");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const YahooFinance = require("yahoo-finance2").default;
const cheerio = require("cheerio");
const axios = require("axios");

const dataCache = new Map();
const CACHE_DURATION = 60000; // Add this line at top

function excelToJSON(path) {
  const workbook = xlsx.readFile(path);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = xlsx.utils.sheet_to_json(sheet);

  return jsonData;
}

const structureJSONData = (rowData) => {
  const portfolio = [];
  let currentSector = "";
  rowData.forEach((row) => {
    const name = row.__EMPTY_1;
    if (name === "Particulars") return;

    if (name && name.includes("Sector")) {
      currentSector = name.replace(" Sector ", "").trim();
      return;
    }

    if (name === "Others") {
      currentSector = "Others";
      return;
    }

    if (!row.__EMPTY_2 || !row.__EMPTY_3 || typeof row.__EMPTY_2 !== "number")
      return;

    const stock = {
      id: portfolio.length + 1,
      name: name.trim(),
      purchasePrice: row.__EMPTY_2,
      qty: row.__EMPTY_3,
      investment: row.__EMPTY_4,
      portfolioPercentage: row.__EMPTY_5 * 100,
      symbol: row.__EMPTY_6
        ? `${row.__EMPTY_6}.NS`
        : `${name.toUpperCase().replace(/\s/g, "")}.NS`,
      cmp: row.__EMPTY_7 || 0,
      presentValue: row.__EMPTY_8 || 0,
      gainLoss: row.__EMPTY_9 || 0,
      gainLossPercent: (row.__EMPTY_10 || 0) * 100 || 0,
      marketCap: row.__EMPTY_11,
      pe: row.__EMPTY_12,
      latestEarnings: row.__EMPTY_13,

      fundamentals: {
        revenue: row["Core Fundamentals"] || 0,
        ebitda: row.__EMPTY_14 || 0,
        ebitdaPercent: row.__EMPTY_15 || 0,
        pat: row.__EMPTY_16 || 0,
        patPercent: row.__EMPTY_17 || 0,
        cfo1yr: row.__EMPTY_18,
        cfo5yr: row.__EMPTY_19,
        freeCashFlow5yr: row.__EMPTY_20,
        debtToEquity: row.__EMPTY_21,
        bookValue: row.__EMPTY_22,
      },
      growth3yr: {
        revenue: row["Growth (3 years"] || 0,
        ebitda: row.__EMPTY_23 || 0,
        profit: row.__EMPTY_24 || 0,
        marketCap: row.__EMPTY_25,
        priceToSales: row.__EMPTY_26,
        cfoToEbitda: row.__EMPTY_27,
        cfoToPat: row.__EMPTY_28,
        priceToBook: row.__EMPTY_29,
      },
      stage: row.__EMPTY_30,
      remark: row.__EMPTY_32,
      sector: currentSector || "Others",
    };
    portfolio.push(stock);
  });

  return portfolio;
};

async function getStockData() {
  try {
    const query = "AAPL"; // Apple stock ticker
    const yahooFinance = new YahooFinance();
    const result = await yahooFinance.search("Apple");
    const quote = await yahooFinance.quote("AAPL");
    // console.log(result);
    // console.log(quote)
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

// getStockData()
const AXIOS_OPTIONS = {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36",
  }, // adding the User-Agent header as one way to prevent the request from being blocked
  params: {
    hl: "en", // parameter defines the language to use for the Google search
  },
};

async function scrapeGoogleFinance(symbol) {
  const cacheKey = `google_${symbol}`;
  const cached = dataCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const cleanSymbol = symbol.replace(".NS", "").replace(".BO", "");
    const url = `https://www.google.com/finance/quote/${cleanSymbol}:NSE`;

    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 10000,
    });

    // Save HTML for debugging
    require("fs").writeFileSync("google_debug.html", data);

    const $ = cheerio.load(data);

    let peRatio = null;
    let latestEarnings = null;

    // Log all text to find the pattern
    console.log("=== Searching for PE ratio and EPS ===");
    $("div").each((i, elem) => {
      const text = $(elem).text().trim();

      if (text.includes("PE ratio") || text.includes("EPS")) {
        console.log(`Found: "${text}"`);
        console.log(`Next sibling: "${$(elem).next().text()}"`);
        console.log(`Parent: "${$(elem).parent().text().substring(0, 100)}"`);
        console.log("---");
      }
    });

    const result = { peRatio, latestEarnings };
    dataCache.set(cacheKey, { data, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error(`Google scrape error for ${symbol}:`, error.message);
    return { peRatio: null, latestEarnings: null };
  }
}

scrapeGoogleFinance("RELIANCE.NS").then(console.log);

const app = express();

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.get("/api/portfolio", (req, res) => {
  try {
    const filePath = path.join(__dirname, "data.xlsx");
    const jsonData = excelToJSON(filePath);
    const portfolio = structureJSONData(jsonData);

    const sectorMap = new Map();
    portfolio.forEach((stock) => {
      const sector = stock.sector;
      if (!sectorMap.has(sector)) {
        sectorMap.set(sector, []);
      }
      sectorMap.get(sector).push(stock);
    });

    const sectors = Array.from(sectorMap.entries()).map(([sector, stocks]) => {
      const totalInvestment = stocks.reduce((sum, s) => sum + s.investment, 0);
      const totalPresentValue = stocks.reduce(
        (sum, s) => sum + s.presentValue,
        0
      );
      const gainLoss = totalPresentValue - totalInvestment;
      const gainLossPercent = (gainLoss / totalInvestment) * 100;

      return {
        sector,
        totalInvestment,
        presentValue: totalPresentValue,
        gainLoss,
        gainLossPercent,
        stocks,
      };
    });

    res.status(200).json({ success: true, data: sectors });
  } catch (error) {
    console.error(error);
  }
});

app.listen(4000, () => {
  console.log("Server is running on port 4000");
});
