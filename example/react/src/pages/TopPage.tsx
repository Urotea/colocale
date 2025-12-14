import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { pickMessages, createTranslator, Locale } from "colocale";
import { commonTranslations } from "../translations";
import jaCommon from "../../messages/ja/common.json";
import enCommon from "../../messages/en/common.json";

function TopPage() {
  const { locale = "en" } = useParams<{ locale: string }>();
  const [inputText, setInputText] = useState("");

  // Compose messages
  const allMessages = {
    ja: { common: jaCommon },
    en: { common: enCommon },
  };

  // Pick messages for current locale
  const messages = useMemo(
    () => pickMessages(allMessages, commonTranslations, locale as Locale),
    [locale]
  );

  // Create translator
  const t = createTranslator(messages, commonTranslations);

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h1>Colocale React Example</h1>

      <div style={{ marginBottom: "20px" }}>
        <Link to="/ja/top" style={{ marginRight: "10px" }}>
          日本語
        </Link>
        <Link to="/en/top">English</Link>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label htmlFor="nameInput">Name: </label>
        <input
          id="nameInput"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Enter your name"
          style={{ padding: "5px", width: "200px" }}
        />
      </div>

      <div style={{ fontSize: "1.5em", fontWeight: "bold" }}>
        {t("greeting", { name: inputText || "World" })}
      </div>
    </div>
  );
}

export default TopPage;
