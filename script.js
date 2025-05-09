// 状態管理
const state = {
    raceInfo: {},
    players: [],
    selections: { first: [], second: [], third: [] },
    votes: {},
    deductionRate: 0.25
  };
  
  // 選手データとレース情報を読み込む
  async function loadData(jsonData) {
    try {
      state.raceInfo = jsonData.raceInfo || {};
      state.players = Array.isArray(jsonData.players) ? jsonData.players.map(p => ({ ...p, id: String(p.id) })) : [];
      if (!state.players.every(p => p.id && p.name && p.info)) {
        throw new Error('選手データの形式が不正です。');
      }
      state.selections = { first: [], second: [], third: [] };
      state.votes = {};
      render();
    } catch (error) {
      document.getElementById('errorMessage').textContent = `エラー: ${error.message}`;
      console.error(error);
    }
  }
  
  // JSONファイルを読み込む
  function loadJsonFile() {
    const fileInput = document.getElementById('jsonFileInput');
    fileInput.click();
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const jsonData = JSON.parse(event.target.result);
            loadData(jsonData);
          } catch (error) {
            document.getElementById('errorMessage').textContent = `エラー: JSON解析に失敗しました (${error.message})`;
            console.error(error);
          }
        };
        reader.readAsText(file);
      }
    };
  }
  
  // 選択を一括解除（投票データは保持）
  function clearSelections() {
    state.selections = { first: [], second: [], third: [] };
    render();
  }
  
  // 選択状態を更新
  function updateSelection(position, playerId, checked) {
    const ids = state.selections[position];
    if (checked) {
      if (!ids.includes(playerId)) ids.push(playerId);
    } else {
      state.selections[position] = ids.filter(id => id !== playerId);
    }
    render();
  }
  
  // 組み合わせを再帰的に生成（重複を無効）
  function generateCombinations() {
    const result = [];
    const { first, second, third } = state.selections;
  
    function buildCombo(positions, current = []) {
      if (current.length === 3) {
        const unique = new Set(current);
        if (unique.size === 3) {
          result.push(current.join('-'));
        }
        return;
      }
  
      const nextPlayers = positions[current.length];
      for (const player of nextPlayers) {
        buildCombo(positions, [...current, player]);
      }
    }
  
    buildCombo([first, second, third]);
    return result;
  }
  
  // 全可能な組み合わせを生成
  function generateAllPossibleCombinations() {
    const ids = state.players.map(p => p.id);
    const combos = [];
    for (const i of ids) {
      for (const j of ids) {
        for (const k of ids) {
          if (i !== j && j !== k && i !== k) {
            combos.push(`${i}-${j}-${k}`);
          }
        }
      }
    }
    return combos;
  }
  
  // 投票を記録
  function castVotes() {
    const combos = generateCombinations();
    const amount = parseInt(document.getElementById('voteAmount').value);
    if (combos.length === 0) {
      alert("有効な組み合わせがありません。");
      return;
    }
    combos.forEach(combo => {
      state.votes[combo] = (state.votes[combo] || 0) + amount;
    });
    state.selections = { first: [], second: [], third: [] };
    document.getElementById('voteAmount').value = '100';
    const notification = document.getElementById('notification');
    notification.style.display = 'block';
    setTimeout(() => {
      notification.style.display = 'none';
    }, 1500);
    render();
  }
  
  // オッズを計算
  function calculateOdds() {
    const total = Object.values(state.votes).reduce((sum, v) => sum + v, 0);
    const afterDeduction = total * (1 - state.deductionRate);
    const allCombos = generateAllPossibleCombinations();
    const odds = {};
    allCombos.forEach(combo => {
      const votes = state.votes[combo] || 0;
      odds[combo] = votes === 0 ? "0.00" : (afterDeduction / votes).toFixed(2);
    });
    return odds;
  }
  
  // 選手名を取得
  function getPlayerName(id) {
    const player = state.players.find(p => p.id === id);
    return player ? player.name : "";
  }
  
  // 組み合わせをフォーマット
  function formatCombination(combo) {
    const [a, b, c] = combo.split("-");
    return `${getPlayerName(a)} → ${getPlayerName(b)} → ${getPlayerName(c)}`;
  }
  
  // 番号を色付きボックスで表示（組み合わせ用）
  function formatNumberWithBox(num) {
    const className = `number-box number-${num}`;
    return `<span class="${className}">${num}</span>`;
  }
  
  // マークシートの番号セル用（セル全体に背景色を適用）
  function formatNumberCell(num) {
    return num; // 番号のみ返す。背景色は td のクラスで制御
  }
  
  // 組み合わせを色付きボックスで表示
  function formatComboWithBoxes(combo) {
    const [a, b, c] = combo.split("-");
    return `${formatNumberWithBox(a)}-${formatNumberWithBox(b)}-${formatNumberWithBox(c)}`;
  }
  
  // UIをレンダリング
  function render() {
    // レース情報の表示
    const raceNumber = document.getElementById("raceNumber");
    const raceTitle = document.getElementById("raceTitle");
    const raceInfo = document.getElementById("raceInfo");
  
    raceNumber.textContent = state.raceInfo.raceNumber || "未設定";
    raceTitle.innerHTML = `
      <span>${state.raceInfo.venue || "未設定"}競人</span>
      <span>${state.raceInfo.eventName || "未設定"}杯</span>
    `;
    raceInfo.innerHTML = `
      発走 ${state.raceInfo.startTime || "未設定"}
      <span class="deadline">締切 ${state.raceInfo.deadline || "未設定"}</span>
      <br>${state.raceInfo.date || "未設定"} ${state.raceInfo.distance || "未設定"} (${state.raceInfo.laps || "未設定"})
    `;
  
    // マークシート
    const tbody = document.getElementById("markSheetBody");
    tbody.innerHTML = "";
    state.players.forEach(player => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="number-cell number-${player.id}">${formatNumberCell(player.id)}</td>
        <td class="player-name">${player.name}<br><small>${player.info}</small></td>
        <td><div class="checkbox-container"><input type="checkbox" name="first" value="${player.id}" id="first-${player.id}" ${state.selections.first.includes(player.id) ? 'checked' : ''}><label for="first-${player.id}"></label></div></td>
        <td><div class="checkbox-container"><input type="checkbox" name="second" value="${player.id}" id="second-${player.id}" ${state.selections.second.includes(player.id) ? 'checked' : ''}><label for="second-${player.id}"></label></div></td>
        <td><div class="checkbox-container"><input type="checkbox" name="third" value="${player.id}" id="third-${player.id}" ${state.selections.third.includes(player.id) ? 'checked' : ''}><label for="third-${player.id}"></label></div></td>
      `;
      tbody.appendChild(tr);
    });
  
    // チェックボックスイベント
    ["first", "second", "third"].forEach(position => {
      document.querySelectorAll(`input[name="${position}"]`).forEach(cb => {
        cb.addEventListener('change', (e) => {
          updateSelection(position, e.target.value, e.target.checked);
        });
      });
    });
  
    // 選択中の組み合わせ
    const combos = generateCombinations();
    const selectedTable = document.getElementById("selectedCombosTable");
    selectedTable.innerHTML = "";
    const odds = calculateOdds();
    const voteAmount = parseInt(document.getElementById('voteAmount').value);
  
    document.getElementById("voteSummary").textContent = `現在の選択：${combos.length}点（合計 ${combos.length * voteAmount}チップ）`;
  
    const selectedCombosSection = document.getElementById("selectedCombosSection");
    if (combos.length === 0) {
      selectedCombosSection.style.display = 'none';
      selectedTable.innerHTML = `<tr><td colspan="3">組み合わせが選択されていません。</td></tr>`;
    } else {
      selectedCombosSection.style.display = 'block';
      combos.forEach(combo => {
        const tr = document.createElement("tr");
        const oddsClass = parseFloat(odds[combo]) <= 10 ? 'low-odds' : '';
        tr.innerHTML = `
          <td>${formatComboWithBoxes(combo)}</td>
          <td>${formatCombination(combo)}</td>
          <td class="${oddsClass}">${odds[combo]}</td>
        `;
        selectedTable.appendChild(tr);
      });
    }
  
    // 現在のオッズ（人気順番号付き、表示項目のみカウント）
    const oddsTable = document.getElementById("oddsTable");
    oddsTable.innerHTML = "";
    const allCombos = generateAllPossibleCombinations();
    allCombos.sort((a, b) => parseFloat(odds[a]) - parseFloat(odds[b]));
    let rank = 1;
    allCombos.forEach(combo => {
      if (odds[combo] === "0.00") return;
      const tr = document.createElement("tr");
      const oddsClass = parseFloat(odds[combo]) <= 10 ? 'low-odds' : '';
      tr.innerHTML = `
        <td>${rank}</td>
        <td>${formatComboWithBoxes(combo)}</td>
        <td>${formatCombination(combo)}</td>
        <td class="${oddsClass}">${odds[combo]}</td>
      `;
      oddsTable.appendChild(tr);
      rank++;
    });
  }
  
  // 投票金額変更時のイベントリスナー
  document.getElementById('voteAmount').addEventListener('change', () => {
    render();
  });
