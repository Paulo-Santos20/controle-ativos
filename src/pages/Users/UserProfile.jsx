import React from 'react';
import styles from './UserProfile.module.css';

const UserProfile = () => {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Meu Perfil</h1>
      </header>

      <div className={styles.content}>
        <div className={styles.formGrid}>
          {/* Card de Informações */}
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Informações Pessoais</h2>
            {/* Avatar aqui */}
            <div className={styles.formGroup}>
              <label htmlFor="name">Nome</label>
              <input type="text" id="name" className={styles.input} defaultValue="Técnico A" />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="email">E-mail</label>
              <input type="email" id="email" className={styles.input} defaultValue="tecnico.a@hcp.com.br" disabled />
            </div>
            <button className={styles.primaryButton}>Salvar Alterações</button>
          </div>

          {/* Card de Senha */}
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Alterar Senha</h2>
            <div className={styles.formGroup}>
              <label htmlFor="currentPassword">Senha Atual</label>
              <input type="password" id="currentPassword" className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="newPassword">Nova Senha</label>
              <input type="password" id="newPassword" className={styles.input} />
            </div>
            <button className={styles.primaryButton}>Alterar Senha</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;