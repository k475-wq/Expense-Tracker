import { useState, useEffect, useRef } from "react";
import "./App.css";
import Papa from "papaparse";
import jsPDF from "jspdf";

import { db, auth } from "./firebase";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";

import {
  Chart,
  registerables,
} from "chart.js";

Chart.register(...registerables);

function App() {
  // =========================================================
  // AUTHENTICATION
  // =========================================================

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  // =========================================================
  // EXPENSES
  // =========================================================

  const [expenses, setExpenses] = useState([]);

  // =========================================================
  // INCOME
  // =========================================================

  const [income, setIncome] = useState([]);

  const [incomeTitle, setIncomeTitle] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");

  // =========================================================
  // DATE FILTER
  // =========================================================

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // =========================================================
  // MONTHLY REPORT
  // =========================================================

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();

    return `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;
  });

  // =========================================================
  // BUDGET
  // =========================================================

  const [budget, setBudget] = useState(() => {
    const savedBudget =
      localStorage.getItem("monthlyBudget");

    return savedBudget
      ? Number(savedBudget)
      : 0;
  });

  const [budgetInput, setBudgetInput] = useState("");

  // =========================================================
  // EXPENSE FORM
  // =========================================================

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");

  // =========================================================
  // SEARCH
  // =========================================================

  const [search, setSearch] = useState("");

  // =========================================================
  // EDIT
  // =========================================================

  const [editingId, setEditingId] = useState(null);

  // =========================================================
  // CHART.JS REFERENCES
  // =========================================================

  const barChartRef = useRef(null);
  const pieChartRef = useRef(null);

  const barChartInstance = useRef(null);
  const pieChartInstance = useRef(null);

  // =========================================================
  // AUTH STATE
  // =========================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);

        if (!currentUser) {
          setExpenses([]);
          setIncome([]);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // =========================================================
  // LOAD DATA
  // =========================================================

  useEffect(() => {
    if (user) {
      loadExpenses();
      loadIncome();
    }
  }, [user]);

  // =========================================================
  // SAVE BUDGET
  // =========================================================

  useEffect(() => {
    localStorage.setItem(
      "monthlyBudget",
      budget
    );
  }, [budget]);

  // =========================================================
  // AUTHENTICATION
  // =========================================================

  const handleAuth = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      alert(
        "Please enter email and password."
      );
      return;
    }

    if (password.length < 6) {
      alert(
        "Password must be at least 6 characters."
      );
      return;
    }

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        alert(
          "Account created successfully!"
        );
      } else {
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

        alert(
          "Signed in successfully!"
        );
      }

      setEmail("");
      setPassword("");
    } catch (error) {
      console.error(
        "Authentication error:",
        error
      );

      if (
        error.code ===
        "auth/email-already-in-use"
      ) {
        alert(
          "This email is already registered. Please sign in."
        );
      } else if (
        error.code ===
        "auth/invalid-credential"
      ) {
        alert(
          "Invalid email or password."
        );
      } else if (
        error.code ===
        "auth/invalid-email"
      ) {
        alert(
          "Please enter a valid email address."
        );
      } else if (
        error.code ===
        "auth/weak-password"
      ) {
        alert(
          "Password must be at least 6 characters."
        );
      } else {
        alert(error.message);
      }
    }
  };

  // =========================================================
  // SIGN OUT
  // =========================================================

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
      alert("Failed to sign out.");
    }
  };

  // =========================================================
  // LOAD EXPENSES
  // =========================================================

  const loadExpenses = async () => {
    if (!user) return;

    try {
      const expensesQuery = query(
        collection(db, "expenses"),
        where(
          "userId",
          "==",
          user.uid
        )
      );

      const snapshot =
        await getDocs(
          expensesQuery
        );

      const data =
        snapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        );

      setExpenses(data);
    } catch (error) {
      console.error(
        "Error loading expenses:",
        error
      );
    }
  };

  // =========================================================
  // LOAD INCOME
  // =========================================================

  const loadIncome = async () => {
    if (!user) return;

    try {
      const incomeQuery = query(
        collection(db, "income"),
        where(
          "userId",
          "==",
          user.uid
        )
      );

      const snapshot =
        await getDocs(
          incomeQuery
        );

      const data =
        snapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        );

      setIncome(data);
    } catch (error) {
      console.error(
        "Error loading income:",
        error
      );
    }
  };

  // =========================================================
  // DATE KEY
  // =========================================================

  const getLocalDateKey = () => {
    const now = new Date();

    return `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
  };

  // =========================================================
  // ADD / UPDATE EXPENSE
  // =========================================================

  const addExpense = async (e) => {
    e.preventDefault();

    if (!user) {
      alert(
        "Please sign in first."
      );
      return;
    }

    if (!title || !amount) {
      alert(
        "Please enter expense name and amount."
      );
      return;
    }

    if (Number(amount) <= 0) {
      alert(
        "Amount must be greater than 0."
      );
      return;
    }

    if (editingId !== null) {
      try {
        await updateDoc(
          doc(
            db,
            "expenses",
            editingId
          ),
          {
            title,
            amount: Number(amount),
            category,
          }
        );

        setExpenses(
          expenses.map(
            (expense) =>
              expense.id ===
              editingId
                ? {
                    ...expense,
                    title,
                    amount:
                      Number(
                        amount
                      ),
                    category,
                  }
                : expense
          )
        );

        setEditingId(null);
        setTitle("");
        setAmount("");
        setCategory("Food");

        alert(
          "Expense updated successfully!"
        );

        return;
      } catch (error) {
        console.error(error);
        alert(
          "Failed to update expense."
        );
        return;
      }
    }

    const now = new Date();

    const newExpense = {
      title,
      amount: Number(amount),
      category,
      date:
        now.toLocaleString(),
      dateKey:
        getLocalDateKey(),
      userId: user.uid,
    };

    try {
      const docRef =
        await addDoc(
          collection(
            db,
            "expenses"
          ),
          newExpense
        );

      setExpenses([
        ...expenses,
        {
          id: docRef.id,
          ...newExpense,
        },
      ]);

      setTitle("");
      setAmount("");
      setCategory("Food");

      alert(
        "Expense added successfully!"
      );
    } catch (error) {
      console.error(error);
      alert(
        "Failed to save expense."
      );
    }
  };

  // =========================================================
  // DELETE EXPENSE
  // =========================================================

  const deleteExpense = async (
    id
  ) => {
    if (
      !window.confirm(
        "Delete this expense?"
      )
    ) {
      return;
    }

    try {
      await deleteDoc(
        doc(
          db,
          "expenses",
          id
        )
      );

      setExpenses(
        expenses.filter(
          (expense) =>
            expense.id !== id
        )
      );

      alert(
        "Expense deleted."
      );
    } catch (error) {
      console.error(error);
      alert(
        "Failed to delete expense."
      );
    }
  };

  // =========================================================
  // EDIT EXPENSE
  // =========================================================

  const editExpense = (
    expense
  ) => {
    setEditingId(
      expense.id
    );

    setTitle(
      expense.title
    );

    setAmount(
      expense.amount
    );

    setCategory(
      expense.category
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =========================================================
  // CANCEL EDIT
  // =========================================================

  const cancelEdit = () => {
    setEditingId(null);
    setTitle("");
    setAmount("");
    setCategory("Food");
  };

  // =========================================================
  // ADD INCOME
  // =========================================================

  const addIncome = async (e) => {
    e.preventDefault();

    if (!user) {
      alert(
        "Please sign in first."
      );
      return;
    }

    if (
      !incomeTitle ||
      !incomeAmount
    ) {
      alert(
        "Please enter income source and amount."
      );
      return;
    }

    if (
      Number(incomeAmount) <= 0
    ) {
      alert(
        "Income amount must be greater than 0."
      );
      return;
    }

    const now = new Date();

    const newIncome = {
      title: incomeTitle,
      amount:
        Number(incomeAmount),
      date:
        now.toLocaleString(),
      dateKey:
        getLocalDateKey(),
      userId: user.uid,
    };

    try {
      const docRef =
        await addDoc(
          collection(
            db,
            "income"
          ),
          newIncome
        );

      setIncome([
        ...income,
        {
          id: docRef.id,
          ...newIncome,
        },
      ]);

      setIncomeTitle("");
      setIncomeAmount("");

      alert(
        "Income added successfully!"
      );
    } catch (error) {
      console.error(error);
      alert(
        "Failed to save income."
      );
    }
  };

  // =========================================================
  // DELETE INCOME
  // =========================================================

  const deleteIncome = async (
    id
  ) => {
    if (
      !window.confirm(
        "Delete this income?"
      )
    ) {
      return;
    }

    try {
      await deleteDoc(
        doc(
          db,
          "income",
          id
        )
      );

      setIncome(
        income.filter(
          (item) =>
            item.id !== id
        )
      );

      alert(
        "Income deleted."
      );
    } catch (error) {
      console.error(error);
      alert(
        "Failed to delete income."
      );
    }
  };

  // =========================================================
  // TRANSACTION DATE
  // =========================================================

  const getTransactionDate = (
    item
  ) => {
    if (item.dateKey) {
      return item.dateKey;
    }

    if (item.date) {
      const parsedDate =
        new Date(
          item.date
        );

      if (
        !isNaN(
          parsedDate.getTime()
        )
      ) {
        return `${parsedDate.getFullYear()}-${String(
          parsedDate.getMonth() + 1
        ).padStart(
          2,
          "0"
        )}-${String(
          parsedDate.getDate()
        ).padStart(
          2,
          "0"
        )}`;
      }
    }

    return "";
  };

  // =========================================================
  // DATE FILTER
  // =========================================================

  const isWithinDateRange = (
    item
  ) => {
    const transactionDate =
      getTransactionDate(item);

    if (!transactionDate) {
      return false;
    }

    if (
      !fromDate &&
      !toDate
    ) {
      return true;
    }

    if (
      fromDate &&
      transactionDate <
        fromDate
    ) {
      return false;
    }

    if (
      toDate &&
      transactionDate >
        toDate
    ) {
      return false;
    }

    return true;
  };

  const dateFilteredExpenses =
    expenses.filter(
      isWithinDateRange
    );

  const dateFilteredIncome =
    income.filter(
      isWithinDateRange
    );

  // =========================================================
  // SEARCH
  // =========================================================

  const filteredExpenses =
    dateFilteredExpenses.filter(
      (expense) => {
        const searchText =
          search.toLowerCase();

        return (
          String(
            expense.title
          )
            .toLowerCase()
            .includes(
              searchText
            ) ||
          String(
            expense.category
          )
            .toLowerCase()
            .includes(
              searchText
            ) ||
          String(
            expense.date
          )
            .toLowerCase()
            .includes(
              searchText
            )
        );
      }
    );

  // =========================================================
  // TOTALS
  // =========================================================

  const total =
    dateFilteredExpenses.reduce(
      (
        sum,
        expense
      ) =>
        sum +
        Number(
          expense.amount
        ),
      0
    );

  const totalIncome =
    dateFilteredIncome.reduce(
      (
        sum,
        item
      ) =>
        sum +
        Number(
          item.amount
        ),
      0
    );

  const balance =
    totalIncome - total;

  // =========================================================
  // BUDGET
  // =========================================================

  const remainingBudget =
    budget - total;

  const budgetPercentage =
    budget > 0
      ? (total / budget) *
        100
      : 0;

  const progressPercentage =
    Math.min(
      Math.max(
        budgetPercentage,
        0
      ),
      100
    );

  const setMonthlyBudget = (
    e
  ) => {
    e.preventDefault();

    if (
      !budgetInput ||
      Number(budgetInput) <=
        0
    ) {
      alert(
        "Please enter a valid monthly budget."
      );
      return;
    }

    setBudget(
      Number(budgetInput)
    );

    setBudgetInput("");

    alert(
      "Monthly budget saved!"
    );
  };

  // =========================================================
  // CATEGORY TOTALS
  // =========================================================

  const categoryTotals =
    dateFilteredExpenses.reduce(
      (
        totals,
        expense
      ) => {
        totals[
          expense.category
        ] =
          (totals[
            expense.category
          ] || 0) +
          Number(
            expense.amount
          );

        return totals;
      },
      {}
    );

  const chartData =
    Object.entries(
      categoryTotals
    ).map(
      ([
        category,
        amount,
      ]) => ({
        category,
        amount,
      })
    );

  const pieData =
    Object.entries(
      categoryTotals
    ).map(
      ([
        category,
        amount,
      ]) => ({
        name: category,
        value: amount,
      })
    );

  const COLORS = [
    "#2563eb",
    "#16a34a",
    "#f59e0b",
    "#dc2626",
    "#9333ea",
    "#0891b2",
  ];

  // =========================================================
  // CLEAR DATE FILTER
  // =========================================================

  const clearDateFilter = () => {
    setFromDate("");
    setToDate("");
  };

  // =========================================================
  // MONTHLY REPORT
  // =========================================================

  const monthlyExpenses =
    expenses.filter(
      (expense) =>
        getTransactionDate(
          expense
        ).startsWith(
          selectedMonth
        )
    );

  const monthlyIncome =
    income.filter(
      (item) =>
        getTransactionDate(
          item
        ).startsWith(
          selectedMonth
        )
    );

  const monthlyExpenseTotal =
    monthlyExpenses.reduce(
      (
        sum,
        expense
      ) =>
        sum +
        Number(
          expense.amount
        ),
      0
    );

  const monthlyIncomeTotal =
    monthlyIncome.reduce(
      (
        sum,
        item
      ) =>
        sum +
        Number(
          item.amount
        ),
      0
    );

  const monthlySavings =
    monthlyIncomeTotal -
    monthlyExpenseTotal;

  const monthlySavingsRate =
    monthlyIncomeTotal > 0
      ? (monthlySavings /
          monthlyIncomeTotal) *
        100
      : 0;

  const monthlyCategoryTotals =
    monthlyExpenses.reduce(
      (
        totals,
        expense
      ) => {
        totals[
          expense.category
        ] =
          (totals[
            expense.category
          ] || 0) +
          Number(
            expense.amount
          );

        return totals;
      },
      {}
    );

  const monthlyCategoryData =
    Object.entries(
      monthlyCategoryTotals
    ).map(
      ([
        category,
        amount,
      ]) => ({
        category,
        amount,
      })
    );

  const highestCategoryEntry =
    Object.entries(
      monthlyCategoryTotals
    ).sort(
      (a, b) =>
        b[1] - a[1]
    )[0];

  const highestCategory =
    highestCategoryEntry
      ? highestCategoryEntry[0]
      : "None";

  const highestCategoryAmount =
    highestCategoryEntry
      ? highestCategoryEntry[1]
      : 0;

  let monthlyInsight =
    "Add income and expenses to generate insights.";

  if (
    monthlyIncomeTotal >
      0 &&
    monthlyExpenseTotal ===
      0
  ) {
    monthlyInsight =
      "Excellent start! You have income recorded but no expenses for this month.";
  } else if (
    monthlyIncomeTotal ===
      0 &&
    monthlyExpenseTotal >
      0
  ) {
    monthlyInsight =
      "You have expenses but no income recorded for this month.";
  } else if (
    monthlySavings < 0
  ) {
    monthlyInsight =
      "⚠️ Your expenses are higher than your income this month.";
  } else if (
    monthlySavingsRate >=
    30
  ) {
    monthlyInsight =
      "🎉 Great job! You are saving more than 30% of your income.";
  } else if (
    monthlySavingsRate >=
    10
  ) {
    monthlyInsight =
      "👍 You are saving money this month. Keep improving your savings rate.";
  } else if (
    monthlyIncomeTotal >
    0
  ) {
    monthlyInsight =
      "💡 Your savings rate is low. Consider reducing unnecessary expenses.";
  }

  const formattedMonth =
    new Date(
      `${selectedMonth}-01T00:00:00`
    ).toLocaleDateString(
      "en-IN",
      {
        month: "long",
        year: "numeric",
      }
    );

  // =========================================================
  // CSV EXPORT
  // =========================================================

  const exportCSV = () => {
    if (
      dateFilteredExpenses.length ===
        0 &&
      dateFilteredIncome.length ===
        0
    ) {
      alert(
        "There are no transactions to export."
      );
      return;
    }

    const exportData = [
      ...dateFilteredIncome.map(
        (item) => ({
          Type: "Income",
          Title: item.title,
          Category: "Income",
          Amount:
            Number(
              item.amount
            ),
          Date: item.date,
        })
      ),

      ...dateFilteredExpenses.map(
        (expense) => ({
          Type: "Expense",
          Title:
            expense.title,
          Category:
            expense.category,
          Amount:
            Number(
              expense.amount
            ),
          Date: expense.date,
        })
      ),
    ];

    const csv =
      Papa.unparse(
        exportData
      );

    const blob =
      new Blob(
        [csv],
        {
          type: "text/csv;charset=utf-8;",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;

    link.download =
      `expense-tracker-${getLocalDateKey()}.csv`;

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(
      url
    );

    alert(
      "CSV file exported successfully!"
    );
  };

  // =========================================================
  // PDF EXPORT
  // =========================================================

  const exportPDF = () => {
    if (
      dateFilteredExpenses.length ===
        0 &&
      dateFilteredIncome.length ===
        0
    ) {
      alert(
        "There are no transactions to export."
      );
      return;
    }

    try {
      const pdf =
        new jsPDF();

      const pageWidth =
        pdf.internal.pageSize.getWidth();

      const pageHeight =
        pdf.internal.pageSize.getHeight();

      // -----------------------------------------------------
      // TITLE
      // -----------------------------------------------------

      pdf.setFontSize(20);

      pdf.text(
        "Expense Tracker Report",
        pageWidth / 2,
        20,
        {
          align: "center",
        }
      );

      // -----------------------------------------------------
      // USER INFORMATION
      // -----------------------------------------------------

      pdf.setFontSize(10);

      pdf.text(
        `Account: ${
          user.email || "User"
        }`,
        15,
        32
      );

      // -----------------------------------------------------
      // DATE FILTER
      // -----------------------------------------------------

      let filterText =
        "Date Range: All Transactions";

      if (
        fromDate ||
        toDate
      ) {
        filterText =
          `Date Range: ${
            fromDate ||
            "Beginning"
          } to ${
            toDate ||
            "Today"
          }`;
      }

      pdf.text(
        filterText,
        15,
        40
      );

      // -----------------------------------------------------
      // FINANCIAL SUMMARY
      // -----------------------------------------------------

      pdf.setFontSize(14);

      pdf.text(
        "Financial Summary",
        15,
        54
      );

      pdf.setFontSize(10);

      pdf.text(
        `Total Income: Rs. ${totalIncome.toFixed(
          2
        )}`,
        15,
        64
      );

      pdf.text(
        `Total Expenses: Rs. ${total.toFixed(
          2
        )}`,
        15,
        72
      );

      pdf.text(
        `Available Balance: Rs. ${balance.toFixed(
          2
        )}`,
        15,
        80
      );

      // -----------------------------------------------------
      // TRANSACTIONS
      // -----------------------------------------------------

      pdf.setFontSize(14);

      pdf.text(
        "Transactions",
        15,
        96
      );

      let y = 108;

      const drawHeader = () => {
        pdf.setFontSize(9);

        pdf.text(
          "Type",
          15,
          y
        );

        pdf.text(
          "Title",
          42,
          y
        );

        pdf.text(
          "Category",
          92,
          y
        );

        pdf.text(
          "Amount",
          140,
          y
        );

        pdf.text(
          "Date",
          170,
          y
        );

        pdf.line(
          15,
          y + 3,
          195,
          y + 3
        );

        y += 10;
      };

      drawHeader();

      const transactions = [
        ...dateFilteredIncome.map(
          (item) => ({
            type: "Income",
            title:
              item.title,
            category:
              "Income",
            amount:
              Number(
                item.amount
              ),
            date: item.date,
          })
        ),

        ...dateFilteredExpenses.map(
          (expense) => ({
            type: "Expense",
            title:
              expense.title,
            category:
              expense.category,
            amount:
              Number(
                expense.amount
              ),
            date:
              expense.date,
          })
        ),
      ];

      transactions.forEach(
        (transaction) => {
          if (
            y >
            pageHeight - 25
          ) {
            pdf.addPage();

            y = 20;

            drawHeader();
          }

          pdf.setFontSize(8);

          pdf.text(
            String(
              transaction.type
            ).substring(
              0,
              12
            ),
            15,
            y
          );

          pdf.text(
            String(
              transaction.title
            ).substring(
              0,
              24
            ),
            42,
            y
          );

          pdf.text(
            String(
              transaction.category
            ).substring(
              0,
              18
            ),
            92,
            y
          );

          pdf.text(
            `Rs. ${transaction.amount.toFixed(
              2
            )}`,
            140,
            y
          );

          pdf.text(
            String(
              transaction.date
            ).substring(
              0,
              18
            ),
            170,
            y
          );

          y += 8;
        }
      );

      // -----------------------------------------------------
      // FOOTER
      // -----------------------------------------------------

      if (
        y >
        pageHeight - 20
      ) {
        pdf.addPage();

        y = 20;
      }

      y += 10;

      pdf.setFontSize(9);

      pdf.text(
        "Generated by Expense Tracker",
        pageWidth / 2,
        y,
        {
          align: "center",
        }
      );

      // -----------------------------------------------------
      // SAVE PDF
      // -----------------------------------------------------

      pdf.save(
        `expense-tracker-${getLocalDateKey()}.pdf`
      );

      alert(
        "PDF file exported successfully!"
      );
    } catch (error) {
      console.error(
        "PDF export error:",
        error
      );

      alert(
        "Failed to create PDF file."
      );
    }
  };

  // =========================================================
  // CHART.JS BAR CHART
  // =========================================================

  useEffect(() => {
    if (!barChartRef.current) {
      return;
    }

    if (barChartInstance.current) {
      barChartInstance.current.destroy();

      barChartInstance.current =
        null;
    }

    if (chartData.length === 0) {
      return;
    }

    barChartInstance.current =
      new Chart(
        barChartRef.current,
        {
          type: "bar",

          data: {
            labels:
              chartData.map(
                (item) =>
                  item.category
              ),

            datasets: [
              {
                label:
                  "Expense Amount (₹)",

                data:
                  chartData.map(
                    (item) =>
                      item.amount
                  ),

                backgroundColor:
                  "#2563eb",

                borderColor:
                  "#1d4ed8",

                borderWidth: 1,
              },
            ],
          },

          options: {
            responsive: true,

            maintainAspectRatio:
              false,

            plugins: {
              legend: {
                display: true,
              },

              tooltip: {
                callbacks: {
                  label:
                    function (
                      context
                    ) {
                      return ` ₹${Number(
                        context.raw
                      ).toFixed(
                        2
                      )}`;
                    },
                },
              },
            },

            scales: {
              y: {
                beginAtZero: true,

                ticks: {
                  callback:
                    function (
                      value
                    ) {
                      return `₹${value}`;
                    },
                },
              },
            },
          },
        }
      );

    return () => {
      if (
        barChartInstance.current
      ) {
        barChartInstance.current.destroy();

        barChartInstance.current =
          null;
      }
    };
  }, [chartData]);

  // =========================================================
  // CHART.JS PIE CHART
  // =========================================================

  useEffect(() => {
    if (!pieChartRef.current) {
      return;
    }

    if (pieChartInstance.current) {
      pieChartInstance.current.destroy();

      pieChartInstance.current =
        null;
    }

    if (pieData.length === 0) {
      return;
    }

    pieChartInstance.current =
      new Chart(
        pieChartRef.current,
        {
          type: "pie",

          data: {
            labels:
              pieData.map(
                (item) =>
                  item.name
              ),

            datasets: [
              {
                label:
                  "Expense Distribution",

                data:
                  pieData.map(
                    (item) =>
                      item.value
                  ),

                backgroundColor:
                  COLORS,

                borderColor:
                  "#ffffff",

                borderWidth: 2,
              },
            ],
          },

          options: {
            responsive: true,

            maintainAspectRatio:
              false,

            plugins: {
              legend: {
                position:
                  "bottom",
              },

              tooltip: {
                callbacks: {
                  label:
                    function (
                      context
                    ) {
                      const value =
                        Number(
                          context.raw
                        );

                      const totalValue =
                        pieData.reduce(
                          (
                            sum,
                            item
                          ) =>
                            sum +
                            Number(
                              item.value
                            ),
                          0
                        );

                      const percentage =
                        totalValue >
                        0
                          ? (
                              (value /
                                totalValue) *
                              100
                            ).toFixed(
                              1
                            )
                          : 0;

                      return ` ${
                        context.label
                      }: ₹${value.toFixed(
                        2
                      )} (${percentage}%)`;
                    },
                },
              },
            },
          },
        }
      );

    return () => {
      if (
        pieChartInstance.current
      ) {
        pieChartInstance.current.destroy();

        pieChartInstance.current =
          null;
      }
    };
  }, [pieData]);

  // =========================================================
  // AUTH LOADING
  // =========================================================

  if (authLoading) {
    return (
      <div className="app">
        <div className="container">

          <h1>
            💰 Expense Tracker
          </h1>

          <p className="subtitle">
            Checking authentication...
          </p>

        </div>
      </div>
    );
  }

  // =========================================================
  // LOGIN / SIGNUP
  // =========================================================

  if (!user) {
    return (
      <div className="app">

        <div className="container">

          <h1>
            💰 Expense Tracker
          </h1>

          <p className="subtitle">
            {isSignUp
              ? "Create your account"
              : "Sign in to continue"}
          </p>

          <form
            onSubmit={handleAuth}
            className="expense-form"
          >

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
            />

            <button type="submit">
              {isSignUp
                ? "Create Account"
                : "Sign In"}
            </button>

          </form>

          <button
            type="button"
            onClick={() =>
              setIsSignUp(
                !isSignUp
              )
            }
          >
            {isSignUp
              ? "Already have an account? Sign In"
              : "Don't have an account? Create Account"}
          </button>

        </div>

      </div>
    );
  }

  // =========================================================
  // MAIN APPLICATION
  // =========================================================

  return (
    <div className="app">

      <div className="container">

        {/* HEADER */}

        <h1>
          💰 Expense Tracker
        </h1>

        <p className="subtitle">
          Track your daily expenses easily
        </p>

        <button
          onClick={
            handleSignOut
          }
        >
          Sign Out
        </button>

        {/* FINANCIAL OVERVIEW */}

        <div className="total-card">

          <p>
            Total Income
          </p>

          <h2>
            ₹
            {totalIncome.toFixed(
              2
            )}
          </h2>

        </div>

        <div className="total-card">

          <p>
            Total Expenses
          </p>

          <h2>
            ₹
            {total.toFixed(
              2
            )}
          </h2>

        </div>

        <div className="total-card">

          <p>
            {balance >= 0
              ? "Available Balance"
              : "Negative Balance"}
          </p>

          <h2
            className={
              balance >= 0
                ? "success-text"
                : "danger-text"
            }
          >
            ₹
            {Math.abs(
              balance
            ).toFixed(2)}
          </h2>

        </div>

        {/* DATE FILTER */}

        <div className="budget-card">

          <h2>
            📅 Filter by Date
          </h2>

          <div className="budget-form">

            <div>

              <label>
                From Date
              </label>

              <input
                type="date"
                value={fromDate}
                onChange={(e) =>
                  setFromDate(
                    e.target.value
                  )
                }
              />

            </div>

            <div>

              <label>
                To Date
              </label>

              <input
                type="date"
                value={toDate}
                onChange={(e) =>
                  setToDate(
                    e.target.value
                  )
                }
              />

            </div>

          </div>

          <div
            style={{
              marginTop: "15px",
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >

            <button
              type="button"
              onClick={() => {

                if (
                  fromDate &&
                  toDate &&
                  fromDate >
                    toDate
                ) {

                  alert(
                    "From Date cannot be after To Date."
                  );

                  return;
                }

                alert(
                  "Date filter applied successfully!"
                );

              }}
            >
              🔍 Apply Date Filter
            </button>

            {(fromDate ||
              toDate) && (

              <button
                type="button"
                onClick={
                  clearDateFilter
                }
              >
                🔄 Clear Filter
              </button>

            )}

          </div>

          {(fromDate ||
            toDate) && (

            <p
              style={{
                marginTop:
                  "15px",
              }}
            >
              Showing transactions
              {fromDate
                ? ` from ${fromDate}`
                : ""}
              {toDate
                ? ` to ${toDate}`
                : ""}
            </p>

          )}

        </div>

        {/* BUDGET */}

        <div className="budget-card">

          <div className="budget-header">

            <div>

              <p>
                Monthly Budget
              </p>

              <h2>
                ₹
                {budget.toFixed(
                  2
                )}
              </h2>

            </div>

            <div className="budget-icon">
              🎯
            </div>

          </div>

          <form
            onSubmit={
              setMonthlyBudget
            }
            className="budget-form"
          >

            <input
              type="number"
              placeholder="Enter monthly budget"
              value={budgetInput}
              onChange={(e) =>
                setBudgetInput(
                  e.target.value
                )
              }
            />

            <button type="submit">
              Set Budget
            </button>

          </form>

          {budget > 0 && (

            <>

              <div className="budget-info">

                <div>

                  <span>
                    Spent
                  </span>

                  <strong>
                    ₹
                    {total.toFixed(
                      2
                    )}
                  </strong>

                </div>

                <div>

                  <span>
                    {remainingBudget >=
                    0
                      ? "Remaining"
                      : "Over Budget"}
                  </span>

                  <strong
                    className={
                      remainingBudget <
                      0
                        ? "danger-text"
                        : "success-text"
                    }
                  >
                    ₹
                    {Math.abs(
                      remainingBudget
                    ).toFixed(
                      2
                    )}
                  </strong>

                </div>

              </div>

              <div className="progress-container">

                <div
                  className={`progress-bar ${
                    budgetPercentage >=
                    100
                      ? "progress-danger"
                      : budgetPercentage >=
                        80
                      ? "progress-warning"
                      : ""
                  }`}
                  style={{
                    width: `${progressPercentage}%`,
                  }}
                ></div>

              </div>

              <p className="budget-percentage">

                {budgetPercentage.toFixed(
                  0
                )}
                %
                of your budget used

              </p>

              {remainingBudget <
                0 && (

                <div className="budget-alert">

                  ⚠️ You have exceeded
                  your monthly budget
                  by ₹
                  {Math.abs(
                    remainingBudget
                  ).toFixed(
                    2
                  )}

                </div>

              )}

              {remainingBudget >=
                0 &&
                budgetPercentage >=
                  80 && (

                <div className="budget-warning">

                  ⚠️ You have used more
                  than 80% of your
                  monthly budget.

                </div>

              )}

            </>

          )}

        </div>

        {/* MONTHLY REPORT */}

        <div className="budget-card">

          <h2>
            📊 Monthly Reports & Insights
          </h2>

          <p className="subtitle">
            Analyze your financial performance
          </p>

          <label>
            Select Month
          </label>

          <input
            type="month"
            value={selectedMonth}
            onChange={(e) =>
              setSelectedMonth(
                e.target.value
              )
            }
            style={{
              width: "100%",
              marginTop: "8px",
            }}
          />

          <h2
            style={{
              marginTop:
                "20px",
            }}
          >
            {formattedMonth}
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "15px",
              marginTop:
                "20px",
            }}
          >

            <div className="total-card">

              <p>
                Monthly Income
              </p>

              <h2>
                ₹
                {monthlyIncomeTotal.toFixed(
                  2
                )}
              </h2>

            </div>

            <div className="total-card">

              <p>
                Monthly Expenses
              </p>

              <h2>
                ₹
                {monthlyExpenseTotal.toFixed(
                  2
                )}
              </h2>

            </div>

            <div className="total-card">

              <p>
                Monthly Savings
              </p>

              <h2
                className={
                  monthlySavings >=
                  0
                    ? "success-text"
                    : "danger-text"
                }
              >
                ₹
                {Math.abs(
                  monthlySavings
                ).toFixed(
                  2
                )}
              </h2>

            </div>

            <div className="total-card">

              <p>
                Savings Rate
              </p>

              <h2>
                {monthlySavingsRate.toFixed(
                  1
                )}
                %
              </h2>

            </div>

          </div>

          <div
            style={{
              marginTop:
                "25px",
              padding:
                "20px",
              borderRadius:
                "12px",
              background:
                "#f8fafc",
            }}
          >

            <h3>
              🏆 Highest Spending Category
            </h3>

            <p>
              <strong>
                {highestCategory}
              </strong>
            </p>

            <p>
              ₹
              {highestCategoryAmount.toFixed(
                2
              )}
            </p>

          </div>

          <div
            style={{
              marginTop:
                "20px",
              padding:
                "20px",
              borderRadius:
                "12px",
              background:
                "#eff6ff",
            }}
          >

            <h3>
              💡 Financial Insight
            </h3>

            <p>
              {monthlyInsight}
            </p>

          </div>

          {monthlyCategoryData.length >
            0 && (

            <div
              style={{
                marginTop:
                  "25px",
              }}
            >

              <h3>
                📋 Monthly Category Breakdown
              </h3>

              {monthlyCategoryData.map(
                (item) => {

                  const percentage =
                    monthlyExpenseTotal >
                    0
                      ? (item.amount /
                          monthlyExpenseTotal) *
                        100
                      : 0;

                  return (

                    <div
                      key={
                        item.category
                      }
                      style={{
                        marginTop:
                          "15px",
                      }}
                    >

                      <div
                        style={{
                          display:
                            "flex",
                          justifyContent:
                            "space-between",
                        }}
                      >

                        <strong>
                          {item.category}
                        </strong>

                        <span>
                          ₹
                          {item.amount.toFixed(
                            2
                          )}
                        </span>

                      </div>

                      <div
                        style={{
                          height:
                            "10px",
                          background:
                            "#e5e7eb",
                          borderRadius:
                            "10px",
                          marginTop:
                            "6px",
                        }}
                      >

                        <div
                          style={{
                            width: `${percentage}%`,
                            height:
                              "100%",
                            background:
                              "#2563eb",
                            borderRadius:
                              "10px",
                          }}
                        ></div>

                      </div>

                      <small>
                        {percentage.toFixed(
                          1
                        )}
                        %
                      </small>

                    </div>

                  );
                }
              )}

            </div>

          )}

        </div>

        {/* DATA EXPORT */}

        <div className="budget-card">

          <h2>
            📥 Export Transactions
          </h2>

          <p className="subtitle">
            Download your income and expenses
            as CSV or PDF.
          </p>

          {(fromDate ||
            toDate) && (

            <p>
              The export will use your
              selected date filter.
            </p>

          )}

          <div
            style={{
              display:
                "flex",
              gap: "10px",
              flexWrap:
                "wrap",
              marginTop:
                "15px",
            }}
          >

            <button
              type="button"
              onClick={
                exportCSV
              }
            >
              📊 Export CSV
            </button>

            <button
              type="button"
              onClick={
                exportPDF
              }
            >
              📄 Export PDF
            </button>

          </div>

        </div>

        {/* ADD INCOME */}

        <div className="budget-card">

          <h2>
            💰 Add Income
          </h2>

          <form
            onSubmit={
              addIncome
            }
            className="expense-form"
          >

            <input
              type="text"
              placeholder="Income source"
              value={
                incomeTitle
              }
              onChange={(e) =>
                setIncomeTitle(
                  e.target.value
                )
              }
            />

            <input
              type="number"
              placeholder="Income amount"
              value={
                incomeAmount
              }
              onChange={(e) =>
                setIncomeAmount(
                  e.target.value
                )
              }
            />

            <button type="submit">
              + Add Income
            </button>

          </form>

        </div>

        {/* ADD EXPENSE */}

        <form
          onSubmit={
            addExpense
          }
          className="expense-form"
        >

          <input
            type="text"
            placeholder="Expense name"
            value={title}
            onChange={(e) =>
              setTitle(
                e.target.value
              )
            }
          />

          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) =>
              setAmount(
                e.target.value
              )
            }
          />

          <select
            value={category}
            onChange={(e) =>
              setCategory(
                e.target.value
              )
            }
          >

            <option value="Food">
              Food
            </option>

            <option value="Transport">
              Transport
            </option>

            <option value="Shopping">
              Shopping
            </option>

            <option value="Bills">
              Bills
            </option>

            <option value="Entertainment">
              Entertainment
            </option>

            <option value="Other">
              Other
            </option>

          </select>

          <button type="submit">

            {editingId !==
            null
              ? "✓ Update Expense"
              : "+ Add Expense"}

          </button>

          {editingId !==
            null && (

            <button
              type="button"
              onClick={
                cancelEdit
              }
            >
              Cancel Edit
            </button>

          )}

        </form>

        {/* SEARCH */}

        <div className="search-box">

          <input
            type="text"
            placeholder="🔍 Search expenses..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
          />

        </div>

        {/* EXPENSE SUMMARY */}

        {dateFilteredExpenses.length >
          0 && (

          <div className="summary">

            <h2>
              Expense Summary
            </h2>

            {Object.entries(
              categoryTotals
            ).map(
              ([
                category,
                amount,
              ]) => (

                <p
                  key={
                    category
                  }
                >

                  <strong>
                    {category}
                  </strong>

                  <span>
                    ₹
                    {amount.toFixed(
                      2
                    )}
                  </span>

                </p>

              )
            )}

          </div>

        )}

        {/* =================================================
            CHART.JS CHARTS
        ================================================= */}

        {chartData.length >
          0 && (

          <>

            {/* BAR CHART */}

            <div className="chart-container">

              <h2>
                📊 Expense Chart
              </h2>

              <div
                style={{
                  position:
                    "relative",
                  width:
                    "100%",
                  height:
                    "300px",
                }}
              >

                <canvas
                  ref={
                    barChartRef
                  }
                ></canvas>

              </div>

            </div>

            {/* PIE CHART */}

            <div className="chart-container">

              <h2>
                🥧 Expense Distribution
              </h2>

              <div
                style={{
                  position:
                    "relative",
                  width:
                    "100%",
                  height:
                    "350px",
                }}
              >

                <canvas
                  ref={
                    pieChartRef
                  }
                ></canvas>

              </div>

            </div>

          </>

        )}

        {/* INCOME LIST */}

        <div className="expense-list">

          <h2>
            💰 Recent Income
          </h2>

          {dateFilteredIncome.length ===
          0 ? (

            <p className="empty">

              {fromDate ||
              toDate
                ? "No income found for the selected dates."
                : "No income added yet."}

            </p>

          ) : (

            dateFilteredIncome.map(
              (item) => (

                <div
                  className="expense-item"
                  key={
                    item.id
                  }
                >

                  <div>

                    <h3>
                      {item.title}
                    </h3>

                    <p>
                      Income
                    </p>

                    <small>
                      {item.date}
                    </small>

                  </div>

                  <div className="expense-right">

                    <strong>
                      ₹
                      {Number(
                        item.amount
                      ).toFixed(
                        2
                      )}
                    </strong>

                    <button
                      onClick={() =>
                        deleteIncome(
                          item.id
                        )
                      }
                    >
                      Delete
                    </button>

                  </div>

                </div>

              )
            )

          )}

        </div>

        {/* EXPENSE LIST */}

        <div className="expense-list">

          <h2>
            Recent Expenses
          </h2>

          {filteredExpenses.length ===
          0 ? (

            <p className="empty">

              {search
                ? "No matching expenses found."
                : fromDate ||
                  toDate
                ? "No expenses found for the selected dates."
                : "No expenses added yet."}

            </p>

          ) : (

            filteredExpenses.map(
              (expense) => (

                <div
                  className="expense-item"
                  key={
                    expense.id
                  }
                >

                  <div>

                    <h3>
                      {expense.title}
                    </h3>

                    <p>
                      {
                        expense.category
                      }
                    </p>

                    <small>
                      {
                        expense.date
                      }
                    </small>

                  </div>

                  <div className="expense-right">

                    <strong>
                      ₹
                      {Number(
                        expense.amount
                      ).toFixed(
                        2
                      )}
                    </strong>

                    <button
                      onClick={() =>
                        editExpense(
                          expense
                        )
                      }
                    >
                      Edit
                    </button>

                    <button
                      onClick={() =>
                        deleteExpense(
                          expense.id
                        )
                      }
                    >
                      Delete
                    </button>

                  </div>

                </div>

              )
            )

          )}

        </div>

      </div>
    </div>
  );
}

export default App;