// Simplified script
fetch('newsData.json')
    .then(response => response.json())
    .then(data => {
        const select = document.getElementById('companySelect');
        const threadContent = document.getElementById('threadContent');

        // Filter companies that have chart data and no N/A values
        const companiesWithChartData = data.filter(item => 
            // Check for chart data
            item.chart_data && 
            item.chart_data.labels && 
            item.chart_data.labels.length > 0 &&
            item.chart_data.data &&
            item.chart_data.data.length > 0 &&
            // Check for N/A values in main fields
            item.summary !== "N/A" &&
            item.features_tweet !== "N/A" &&
            item.business_model_tweet !== "N/A" &&
            item.tech_stack_tweet !== "N/A" &&
            item.category !== "N/A"
        );

        // Populate dropdown with filtered companies
        companiesWithChartData
            // Sort by revenue (highest first)
            .sort((a, b) => {
                // Convert revenue strings to numbers (remove $ and commas)
                const revenueA = parseFloat(a.revenue.replace(/[$,]/g, '')) || 0;
                const revenueB = parseFloat(b.revenue.replace(/[$,]/g, '')) || 0;
                return revenueB - revenueA;
            })
            .forEach(item => {
                const option = document.createElement('option');
                option.value = item.name;
                // Add revenue in parentheses before the name
                const revenue = item.revenue === '$0' ? '($0)' : `(${item.revenue})`;
                option.textContent = `${revenue} ${item.name} - ${item.tagline}`;
                select.appendChild(option);
            });

        // Handle selection
        select.onchange = () => {
            threadContent.innerHTML = '';
            const selectedData = companiesWithChartData.find(item => item.name === select.value);
            if (!selectedData) return;

            const blocks = [
                `${selectedData.name} — ${selectedData.tagline}\n\n💰 Revenue: ${selectedData.revenue} ✅ verified\n🔗 ${selectedData.website_link}\n👤 Founder: ${selectedData.founder_name}\n📅 Launch year: ${selectedData.launch_year}\n\n1/6`,
                `${selectedData.summary}\n\n${selectedData.website_link}\n\n2/6`,
                createBusinessModelBlock(selectedData),
                `🔧 Tech Stack:\n\n${selectedData.tech_stack_tweet}\n\n4/6`,
                `✨ Features:\n\n${selectedData.features_tweet}\n\n5/6`,
                `Would you use tool like ${selectedData.name} or would you like to build an alternative?\n\nLet me know your thoughts below!🤔\n\n6/6`
            ];

            blocks.forEach((content, i) => {
                if (i === 2) { // Business model block with chart
                    threadContent.innerHTML += content;
                } else if (i === 0 && selectedData.screenshot) { // First block with screenshot
                    const escapedContent = content
                        .replace(/`/g, '\\`')
                        .replace(/\$/g, '\\$')
                        .replace(/\\/g, '\\\\');

                    threadContent.innerHTML += `
                        <div class="relative p-4 border border-gray-700 rounded-lg mb-4 bg-gray-800 text-white">
                            <span class="absolute top-2 left-2 text-sm text-gray-400">Tweet ${i + 1}/6</span>
                            <pre class="whitespace-pre-wrap font-sans mt-6">${content}</pre>
                            <div class="relative mt-4 mb-4">
                                <img src="img/screenshots/${selectedData.name}_screenshot.png" 
                                     alt="${selectedData.name} screenshot" 
                                     class="w-full rounded-lg">
                                <button onclick="downloadScreenshot('img/screenshots/${selectedData.name}_screenshot.png', '${selectedData.name}_screenshot.png')" 
                                        class="mt-2 bg-[#1da1f2] text-white px-3 py-1.5 rounded hover:bg-[#1a91da] transition-colors">
                                    Download Screenshot
                                </button>
                            </div>
                            <button onclick="copyText(\`${escapedContent}\`)" 
                                    class="absolute top-2 right-2 bg-[#1da1f2] text-white px-3 py-1.5 rounded hover:bg-[#1a91da] transition-colors">
                                Copy
                            </button>
                        </div>
                    `;
                } else {
                    const escapedContent = content
                        .replace(/`/g, '\\`')
                        .replace(/\$/g, '\\$')
                        .replace(/\\/g, '\\\\');

                    threadContent.innerHTML += `
                        <div class="relative p-4 border border-gray-700 rounded-lg mb-4 bg-gray-800 text-white">
                            <span class="absolute top-2 left-2 text-sm text-gray-400">Tweet ${i + 1}/6</span>
                            <pre class="whitespace-pre-wrap font-sans mt-6">${content}</pre>
                            <button onclick="copyText(\`${escapedContent}\`)" 
                                    class="absolute top-2 right-2 bg-[#1da1f2] text-white px-3 py-1.5 rounded hover:bg-[#1a91da] transition-colors">
                                Copy
                            </button>
                        </div>
                    `;
                }
            });

            // Initialize the chart after the block is added
            if (selectedData.chart_data) {
                createChart(selectedData.chart_data, selectedData.logo);
            }
        };
    });

function createBusinessModelBlock(data) {
    // Escape any backticks, dollar signs and backslashes in the business model text
    const escapedText = data.business_model_tweet
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$')
        .replace(/\\/g, '\\\\');

    return `
        <div class="relative p-4 border border-gray-700 rounded-lg mb-4 bg-gray-800 text-white">
            <span class="absolute top-2 left-2 text-sm text-gray-400">Tweet 3/6</span>
            <pre class="whitespace-pre-wrap font-sans mt-6">💼 Business model:\n\n${data.business_model_tweet}\n\n3/6</pre>
            <button onclick="copyText(\`💼 Business model:\\n\\n${escapedText}\\n\\n3/6\`)" 
                    class="absolute top-2 right-2 bg-[#1da1f2] text-white px-3 py-1.5 rounded hover:bg-[#1a91da] transition-colors">
                Copy
            </button>
            <div class="mt-4">
                <div class="bg-gray-900 rounded-lg p-4" style="height: 400px;">
                    <canvas id="revenueChart"></canvas>
                </div>
                <button onclick="downloadChart()" 
                        class="mt-2 bg-[#1da1f2] text-white px-3 py-1.5 rounded hover:bg-[#1a91da] transition-colors">
                    Download Chart
                </button>
            </div>
        </div>
    `;
}

function createChart(chartData, logoPath) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(29, 161, 242, 0.4)');
    gradient.addColorStop(1, 'rgba(29, 161, 242, 0.0)');

    // Create image object for the logo
    const logo = new Image();
    logo.src = `img/${logoPath}`;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Monthly Revenue',
                data: chartData.data,
                borderColor: '#1da1f2',
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 0,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'MRR',
                    color: '#1da1f2',
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    padding: {
                        top: 20,
                        bottom: 0
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 14
                    },
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `$${context.parsed.y}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        },
                        font: {
                            size: 12
                        },
                        color: '#666'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 12
                        },
                        color: '#666'
                    }
                }
            },
            layout: {
                padding: {
                    top: 40,  // Add more padding at the top for the logo
                    right: 20,
                    bottom: 20,
                    left: 20
                }
            }
        },
        plugins: [{
            id: 'customLogo',
            afterTitle: (chart) => {
                if (logo.complete) {
                    const ctx = chart.ctx;
                    const x = chart.chartArea.left + 20;  // Position logo to the left of title
                    const y = 20;  // Position at the top
                    ctx.drawImage(logo, x, y, 24, 24);  // Smaller logo size
                }
            }
        }]
    });
}

function downloadChart() {
    const canvas = document.getElementById('revenueChart');
    html2canvas(canvas).then(canvas => {
        const link = document.createElement('a');
        link.download = 'revenue-chart.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

function copyText(text) {
    // Create a temporary textarea
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    
    try {
        // Try using the clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text)
                .then(() => alert('Copied!'))
                .catch(() => {
                    // Fallback to selection method
                    textarea.select();
                    document.execCommand('copy');
                    alert('Copied!');
                });
        } else {
            // Use selection method for non-secure contexts
            textarea.select();
            document.execCommand('copy');
            alert('Copied!');
        }
    } catch (err) {
        console.error('Failed to copy text: ', err);
    } finally {
        // Clean up
        document.body.removeChild(textarea);
    }
}

function downloadScreenshot(imgSrc, fileName) {
    fetch(imgSrc)
        .then(response => response.blob())
        .then(blob => {
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = fileName;
            link.click();
            window.URL.revokeObjectURL(link.href);
        })
        .catch(err => console.error('Failed to download screenshot: ', err));
} 